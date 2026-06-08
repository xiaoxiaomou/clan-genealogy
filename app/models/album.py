from datetime import datetime
from app import db


class FamilyAlbum(db.Model):
    """家族相册模型"""
    __tablename__ = 'family_albums'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    family_id = db.Column(db.Integer, db.ForeignKey('families.id'), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    cover_photo_id = db.Column(db.Integer, db.ForeignKey('family_photos.id'), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # 关系
    photos = db.relationship('FamilyPhoto', backref='album', lazy='dynamic', foreign_keys='FamilyPhoto.album_id')

    def to_dict(self):
        return {
            'id': self.id,
            'family_id': self.family_id,
            'name': self.name,
            'description': self.description,
            'cover_photo_id': self.cover_photo_id,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f'<FamilyAlbum {self.name}>'


class FamilyPhoto(db.Model):
    """家族照片模型"""
    __tablename__ = 'family_photos'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    album_id = db.Column(db.Integer, db.ForeignKey('family_albums.id'), nullable=False, index=True)
    member_id = db.Column(db.Integer, db.ForeignKey('members.id'), nullable=True, index=True)
    title = db.Column(db.String(200), nullable=True)
    description = db.Column(db.Text, nullable=True)
    file_path = db.Column(db.String(256), nullable=False)
    file_size = db.Column(db.Integer, nullable=True)
    mime_type = db.Column(db.String(50), nullable=True)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'album_id': self.album_id,
            'member_id': self.member_id,
            'title': self.title,
            'description': self.description,
            'file_path': self.file_path,
            'file_size': self.file_size,
            'mime_type': self.mime_type,
            'uploaded_by': self.uploaded_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<FamilyPhoto {self.title or self.file_path}>'
