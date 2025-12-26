import os
import uuid
import aiofiles
from pathlib import Path
from fastapi import UploadFile, HTTPException

from app.config import get_settings

settings = get_settings()

ALLOWED_EXTENSIONS = {
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "image/jpeg": ".jpg",
    "image/png": ".png",
}

MAX_FILE_SIZE = settings.max_file_size_mb * 1024 * 1024  # Convert to bytes


async def save_upload(file: UploadFile, applicant_id: int) -> tuple[str, str, int, str]:
    """
    Save uploaded file to disk.
    
    Returns: (file_name, file_path, file_size, mime_type)
    """
    # Validate mime type
    if file.content_type not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed: {list(ALLOWED_EXTENSIONS.keys())}"
        )
    
    # Read file content
    content = await file.read()
    file_size = len(content)
    
    # Validate size
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {settings.max_file_size_mb}MB"
        )
    
    # Generate unique filename
    ext = ALLOWED_EXTENSIONS[file.content_type]
    unique_name = f"{uuid.uuid4()}{ext}"
    
    # Create applicant directory
    upload_dir = Path(settings.upload_dir) / str(applicant_id)
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = upload_dir / unique_name
    
    # Save file
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)
    
    return (
        file.filename or unique_name,
        str(file_path),
        file_size,
        file.content_type,
    )


async def delete_file(file_path: str) -> bool:
    """Delete a file from disk."""
    try:
        path = Path(file_path)
        if path.exists():
            path.unlink()
            return True
        return False
    except Exception:
        return False


def get_file_path(file_path: str) -> Path:
    """Get full path to a file, verify it exists."""
    path = Path(file_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return path
