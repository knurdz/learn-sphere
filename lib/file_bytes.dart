import 'dart:typed_data';

import 'package:cross_file/cross_file.dart';
import 'package:file_picker/file_picker.dart';

/// Reads picker bytes on web (in-memory) and native (path or bytes).
Future<Uint8List?> readPlatformFileBytes(PlatformFile file) async {
  final inline = file.bytes;
  if (inline != null && inline.isNotEmpty) return inline;
  final path = file.path;
  if (path == null || path.isEmpty) return null;
  return XFile(path).readAsBytes();
}
