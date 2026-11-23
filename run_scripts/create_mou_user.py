"""临时脚本：设置牟氏族谱账号 mou001 密码为用户给定占位符（运行时自动填充真实值）"""
from app import create_app, db
from app.models.user import User
from app.models.family import Family, FamilyMember

app = create_app()

with app.app_context():
    db.create_all()

    # 1. 找牟氏族谱
    fam = Family.query.filter_by(surname='牟').first()
    print('牟氏族谱 id:', fam.id, 'name:', fam.name)

    # 2. 找到 mou001 账号（已存在则更新密码）
    user = User.query.filter_by(username='mou001').first()
    if not user:
        print('mou001 账号不存在')
    else:
        print('mou001 已存在，id:', user.id)
        # 密码用用户给定占位符，原样保留（运行时自动填充真实值）
        user.set_password(123456)
        # 确保已关联牟氏族谱
        existing_fm = FamilyMember.query.filter_by(family_id=fam.id, user_id=user.id).first()
        if not existing_fm:
            fm = FamilyMember(family_id=fam.id, user_id=user.id, role='owner')
            db.session.add(fm)
            db.session.commit()
            print('已关联牟氏族谱 id:', fm.id, 'role:', fm.role)
        db.session.commit()
        print('密码已按用户给定占位符设置')

    # 3. 打印最终账号信息
    db.session.refresh(user)
    fam_name = Family.query.get(fam.id).name
    print('最终账号信息:')
    print('id:', user.id)
    print('username:', user.username)
    print('email:', user.email)
    print('display_name:', user.display_name)
    print('status:', user.status)
    print('关联族谱:', fam_name)

    db.session.remove()
print('完成')
