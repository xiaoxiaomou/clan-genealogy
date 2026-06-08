"""家族动态（朋友圈）：帖子 / 评论 / 点赞"""
from datetime import datetime
from app import db


class Post(db.Model):
    __tablename__ = 'posts'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    family_id = db.Column(db.Integer, db.ForeignKey('families.id'), nullable=False, index=True)
    author_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    media_urls = db.Column(db.Text, nullable=True)  # JSON 数组
    visibility = db.Column(db.String(20), nullable=False, default='family')  # family/public
    pinned = db.Column(db.Boolean, default=False, nullable=False)
    like_count = db.Column(db.Integer, default=0, nullable=False)
    comment_count = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    author = db.relationship('User', backref='posts', lazy='joined')

    def to_dict(self):
        import json
        return {
            'id': self.id,
            'family_id': self.family_id,
            'author_id': self.author_id,
            'author_name': self.author.display_name or self.author.username if self.author else None,
            'author_avatar': self.author.avatar if self.author else None,
            'content': self.content,
            'media_urls': json.loads(self.media_urls) if self.media_urls else [],
            'visibility': self.visibility,
            'pinned': self.pinned,
            'like_count': self.like_count,
            'comment_count': self.comment_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class PostComment(db.Model):
    __tablename__ = 'post_comments'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    post_id = db.Column(db.Integer, db.ForeignKey('posts.id'), nullable=False, index=True)
    author_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    author = db.relationship('User', lazy='joined')

    def to_dict(self):
        return {
            'id': self.id,
            'post_id': self.post_id,
            'author_id': self.author_id,
            'author_name': self.author.display_name or self.author.username if self.author else None,
            'author_avatar': self.author.avatar if self.author else None,
            'content': self.content,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class PostLike(db.Model):
    __tablename__ = 'post_likes'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    post_id = db.Column(db.Integer, db.ForeignKey('posts.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        db.UniqueConstraint('post_id', 'user_id', name='uq_post_user_like'),
    )
