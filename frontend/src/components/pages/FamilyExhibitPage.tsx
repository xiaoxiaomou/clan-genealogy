// FamilyExhibitPage.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, useToast, FamilyExhibition3D } from '@/components/ui';
import { api } from '@/lib/api';
import { Sparkles } from 'lucide-react';

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
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-4">
          <h1 className="flex items-center gap-2 text-2xl font-semibold sm:text-3xl">
            <Sparkles className="h-6 w-6 text-amber-500" aria-hidden="true" />
            {family?.name || '家族'} · 数字展厅
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            第一人称 3D 漫游：走进家族历史博物馆。中心大厅展示家族族徽，四周展板陈列成员生平。
          </p>
        </header>

        {loading ? (
          <div className="flex h-[500px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
          </div>
        ) : (
          <FamilyExhibition3D members={members} familyId={familyId} />
        )}

        <Card className="mt-4">
          <CardContent className="p-4 text-xs text-muted-foreground">
            <p><strong>操作说明：</strong></p>
            <ul className="mt-1 list-disc pl-5 space-y-0.5">
              <li>点击「进入展厅」按钮开始第一人称体验</li>
              <li>W / A / S / D 键前后左右移动</li>
              <li>鼠标移动控制视角方向</li>
              <li>鼠标悬停展板可查看成员详细生平</li>
              <li>按 Esc 或点击「退出」按钮可退出沉浸模式</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
