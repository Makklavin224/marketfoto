"""Image validation (magic bytes, dimensions, format) and auto-resize logic."""

from __future__ import annotations

from io import BytesIO

from PIL import Image as PILImage

# Allow large images without triggering decompression bomb protection
# 4x default -- legitimate product photos can be large
PILImage.MAX_IMAGE_PIXELS = 178956970

# Magic bytes for supported formats
MAGIC_BYTES: dict[str, list[bytes]] = {
    "image/jpeg": [b"\xff\xd8\xff"],
    "image/png": [b"\x89PNG\r\n\x1a\n"],
    "image/webp": [b"RIFF"],  # followed by 4 bytes then "WEBP"
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
MIN_DIMENSION = 200
MAX_DIMENSION = 8000
RESIZE_THRESHOLD = 4000  # auto-resize if larger side exceeds this


def validate_magic_bytes(file_header: bytes) -> str | None:
    """Check first 12 bytes against known magic bytes.

    Returns detected MIME type string or None if no match.
    Prevents renamed .exe files from passing validation (D-02).
    """
    if len(file_header) < 12:
        return None

    # JPEG: starts with FF D8 FF
    if file_header[:3] == b"\xff\xd8\xff":
        return "image/jpeg"

    # PNG: starts with 89 50 4E 47 0D 0A 1A 0A
    if file_header[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"

    # WebP: RIFF....WEBP
    if file_header[:4] == b"RIFF" and file_header[8:12] == b"WEBP":
        return "image/webp"

    return None


def validate_file_size(size: int) -> bool:
    """Return True if file size is within the 10MB limit (D-01)."""
    return size <= MAX_FILE_SIZE


def get_image_dimensions(data: bytes) -> tuple[int, int]:
    """Open image and return (width, height)."""
    img = PILImage.open(BytesIO(data))
    return img.size  # (width, height)


def validate_dimensions(width: int, height: int) -> tuple[bool, str]:
    """Check min 200x200 and max 8000x8000 (D-01).

    Returns (True, "") or (False, error_message).
    """
    if width < MIN_DIMENSION or height < MIN_DIMENSION:
        return (
            False,
            f"Минимальный размер {MIN_DIMENSION}x{MIN_DIMENSION} пикселей. "
            f"Ваше изображение: {width}x{height}",
        )
    if width > MAX_DIMENSION or height > MAX_DIMENSION:
        return (
            False,
            f"Максимальный размер {MAX_DIMENSION}x{MAX_DIMENSION} пикселей. "
            f"Ваше изображение: {width}x{height}",
        )
    return (True, "")


def resize_if_needed(
    data: bytes, content_type: str
) -> tuple[bytes, int, int, bool]:
    """Resize image if longest side exceeds 4000px (D-06, UPLD-10).

    Returns (image_bytes, new_width, new_height, was_resized).
    """
    img = PILImage.open(BytesIO(data))
    width, height = img.size

    if max(width, height) <= RESIZE_THRESHOLD:
        return (data, width, height, False)

    # Calculate new dimensions preserving aspect ratio
    if width >= height:
        new_width = RESIZE_THRESHOLD
        new_height = int(height * (RESIZE_THRESHOLD / width))
    else:
        new_height = RESIZE_THRESHOLD
        new_width = int(width * (RESIZE_THRESHOLD / height))

    img = img.resize((new_width, new_height), PILImage.LANCZOS)

    # Save back to bytes in the same format
    output = BytesIO()
    fmt = _mime_to_pil_format(content_type)
    save_kwargs: dict = {}
    if fmt == "JPEG":
        # Ensure RGB mode for JPEG (no alpha)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        save_kwargs["quality"] = 95
    elif fmt == "WEBP":
        save_kwargs["quality"] = 95

    img.save(output, format=fmt, **save_kwargs)
    return (output.getvalue(), new_width, new_height, True)


def get_extension_from_mime(mime_type: str) -> str:
    """Map MIME type to file extension."""
    mapping = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
    }
    return mapping.get(mime_type, "bin")


def _mime_to_pil_format(mime_type: str) -> str:
    """Map MIME type to PIL format string."""
    mapping = {
        "image/jpeg": "JPEG",
        "image/png": "PNG",
        "image/webp": "WEBP",
    }
    return mapping.get(mime_type, "PNG")
