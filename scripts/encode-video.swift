// 영상을 잘라 원하는 비트레이트의 H.264(소리 없음)로 다시 인코딩한다. macOS 기본 AVFoundation 사용
// 사용법: swift encode-video.swift <입력> <출력.mp4> <시작초> <길이초> <가로px> <비트레이트bps>
import AVFoundation
let a = CommandLine.arguments
let asset = AVURLAsset(url: URL(fileURLWithPath: a[1]))
let out = URL(fileURLWithPath: a[2]); try? FileManager.default.removeItem(at: out)
let start = Double(a[3])!, dur = Double(a[4])!, width = Double(a[5])!, bitrate = Int(a[6])!
let track = asset.tracks(withMediaType: .video).first!
let size = track.naturalSize.applying(track.preferredTransform)
let w = Int(width), h = Int((width * abs(size.height) / abs(size.width) / 2).rounded()) * 2
print("source", size, "->", w, "x", h)
let reader = try! AVAssetReader(asset: asset)
reader.timeRange = CMTimeRange(start: CMTime(seconds: start, preferredTimescale: 600), duration: CMTime(seconds: dur, preferredTimescale: 600))
let rOut = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange])
reader.add(rOut)
let writer = try! AVAssetWriter(outputURL: out, fileType: .mp4)
writer.shouldOptimizeForNetworkUse = true
let wIn = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: w, AVVideoHeightKey: h,
  AVVideoScalingModeKey: AVVideoScalingModeResizeAspectFill,
  AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: bitrate, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel, AVVideoMaxKeyFrameIntervalKey: 60]])
wIn.transform = track.preferredTransform
writer.add(wIn)
reader.startReading(); writer.startWriting()
writer.startSession(atSourceTime: CMTime(seconds: start, preferredTimescale: 600))
let done = DispatchSemaphore(value: 0)
wIn.requestMediaDataWhenReady(on: DispatchQueue(label: "enc")) {
  while wIn.isReadyForMoreMediaData {
    if let s = rOut.copyNextSampleBuffer() { wIn.append(s) } else { wIn.markAsFinished(); writer.finishWriting { done.signal() }; return }
  }
}
done.wait()
print(writer.status == .completed ? "ok" : "fail \(String(describing: writer.error))")
