// FamilyExhibitPage.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useToast, FamilyExhibition3D } from '@/components/ui';
import { PgPageHead, PgSectionHead, PgSeal } from '@/components/ui/pedigree';
import { api } from '@/lib/api';

export default function FamilyExhibitPage() {
  const { id } = useParams<{ id: string }>();
  const familyId = Number(id);
  const { showToast } = useToast();
  const [members, setMembers] = useState<any[]>([]);
  const [family, setFamily] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!familyId) return;
    (async () => {
      try {
        const [f, m] = await Promise.all([api.getFamily(familyId), api.getMembers(familyId)]);
        setFamily(f.family);
        setMembers(m.members || []);
      } catch (e: any) {
        showToast(e.message || '加载失败', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [familyId]);

  return (
    <Layout>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 pg-rise">
        <PgPageHead
          eyebrow="谱 牒 · 展 厅"
          title={`${family?.name || '家族'} · 数字展厅`}
          subtitle="第一人称 3D 漫游：走进家族历史博物馆。中心大厅展示家族族徽，四周展板陈列成员生平。"
          actions={<PgSeal char="展" size={56} title="数字展厅" />}
        />

        {/* 3D 展厅内容区（组件原样保留，仅外围样式重构） */}
        {loading ? (
          <div className="flex h-[500px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <FamilyExhibition3D members={members} familyId={familyId} />
        )}

        <div className="mt-6">
          <PgSectionHead text="观 展 指 引" />
          <div className="pg-card-soft p-5">
            <ul className="space-y-1 text-xs leading-6 text-muted-foreground">
              <li>点击「进入展厅」按钮开始第一人称体验</li>
              <li>W / A / S / D 键前后左右移动</li>
              <li>鼠标移动控制视角方向</li>
              <li>鼠标悬停展板可查看成员详细生平</li>
              <li>按 Esc 或点击「退出」按钮可退出沉浸模式</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
}
