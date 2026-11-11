// 여러 영상의 구간을 페이드로 이어 붙여 H.264(소리 없음)로 내보낸다. macOS 기본 AVFoundation 사용
// 사용법: swift montage-video.swift <클립목록.txt> <출력.mp4> [가로px] [비트레이트bps] [페이드초]
// 클립목록: 한 줄에 "영상경로|시작초|끝초"
import AVFoundation
let a = CommandLine.arguments
let width = a.count > 3 ? Double(a[3])! : 1280, bitrate = a.count > 4 ? Int(a[4])! : 2_000_000
let fade = a.count > 5 ? Double(a[5])! : 0.5
let ts: Int32 = 600
let lines = try! String(contentsOfFile: a[1], encoding: .utf8).split(separator: "\n").filter { !$0.hasPrefix("#") && !$0.isEmpty }
let comp = AVMutableComposition()
let tracks = [comp.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!,
              comp.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!]
let size = CGSize(width: width, height: (width * 9 / 16 / 2).rounded() * 2)
var cursor = CMTime.zero
var instructions: [AVMutableVideoCompositionInstruction] = []
var placed: [(track: AVMutableCompositionTrack, range: CMTimeRange, transform: CGAffineTransform)] = []
let fadeT = CMTime(seconds: fade, preferredTimescale: ts)
for (i, line) in lines.enumerated() {
  let p = line.split(separator: "|").map(String.init)
  let asset = AVURLAsset(url: URL(fileURLWithPath: p[0]))
  let src = asset.tracks(withMediaType: .video).first!
  let start = CMTime(seconds: Double(p[1])!, preferredTimescale: ts), end = CMTime(seconds: Double(p[2])!, preferredTimescale: ts)
  let dur = end - start
  let at = i == 0 ? CMTime.zero : cursor - fadeT
  let t = tracks[i % 2]
  try! t.insertTimeRange(CMTimeRange(start: start, duration: dur), of: src, at: at)
  let n = src.naturalSize
  let scale = max(size.width / n.width, size.height / n.height)
  let tf = src.preferredTransform.concatenating(CGAffineTransform(scaleX: scale, y: scale))
  placed.append((t, CMTimeRange(start: at, duration: dur), tf))
  cursor = at + dur
}
// 구간마다 명령을 만든다: 단독 구간, 겹치는 구간(앞 클립이 페이드아웃)
for (i, c) in placed.enumerated() {
  let soloStart = i == 0 ? c.range.start : c.range.start + fadeT
  let soloEnd = i == placed.count - 1 ? c.range.end : c.range.end - fadeT
  if soloEnd > soloStart {
    let ins = AVMutableVideoCompositionInstruction(); ins.timeRange = CMTimeRange(start: soloStart, end: soloEnd)
    let l = AVMutableVideoCompositionLayerInstruction(assetTrack: c.track); l.setTransform(c.transform, at: soloStart)
    ins.layerInstructions = [l]; instructions.append(ins)
  }
  if i < placed.count - 1 {
    let next = placed[i + 1]
    let r = CMTimeRange(start: next.range.start, end: c.range.end)
    let ins = AVMutableVideoCompositionInstruction(); ins.timeRange = r
    let out = AVMutableVideoCompositionLayerInstruction(assetTrack: c.track)
    out.setTransform(c.transform, at: r.start); out.setOpacityRamp(fromStartOpacity: 1, toEndOpacity: 0, timeRange: r)
    let inn = AVMutableVideoCompositionLayerInstruction(assetTrack: next.track); inn.setTransform(next.transform, at: r.start)
    ins.layerInstructions = [out, inn]; instructions.append(ins)
  }
}
let vc = AVMutableVideoComposition()
vc.renderSize = size; vc.frameDuration = CMTime(value: 1, timescale: 24); vc.instructions = instructions
let reader = try! AVAssetReader(asset: comp)
let rOut = AVAssetReaderVideoCompositionOutput(videoTracks: comp.tracks(withMediaType: .video), videoSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
rOut.videoComposition = vc; reader.add(rOut)
let outURL = URL(fileURLWithPath: a[2]); try? FileManager.default.removeItem(at: outURL)
let writer = try! AVAssetWriter(outputURL: outURL, fileType: .mp4); writer.shouldOptimizeForNetworkUse = true
let wIn = AVAssetWriterInput(mediaType: .video, outputSettings: [AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: Int(size.width), AVVideoHeightKey: Int(size.height),
  AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: bitrate, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel, AVVideoMaxKeyFrameIntervalKey: 48]])
writer.add(wIn); reader.startReading(); writer.startWriting(); writer.startSession(atSourceTime: .zero)
let done = DispatchSemaphore(value: 0)
wIn.requestMediaDataWhenReady(on: DispatchQueue(label: "enc")) {
  while wIn.isReadyForMoreMediaData {
    if let s = rOut.copyNextSampleBuffer() { wIn.append(s) } else { wIn.markAsFinished(); writer.finishWriting { done.signal() }; return }
  }
}
done.wait()
print(writer.status == .completed ? "ok \(CMTimeGetSeconds(cursor))s" : "fail \(String(describing: writer.error)) \(String(describing: reader.error))")
