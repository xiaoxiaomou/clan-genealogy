export interface User {
  id: number;
  username: string;
  email: string;
  display_name: string | null;
  avatar: string | null;
  is_admin: boolean;
  is_active: boolean;
  status: 'pending' | 'active' | 'rejected';
  relationship_to_creator?: string | null;
  branch_id?: number | null;
  location?: string | null;
  created_at: string;
}

export interface Family {
  id: number;
  name: string;
  description: string | null;
  surname: string | null;
  origin: string | null;
  creator_id: number;
  is_public: boolean;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: number;
  family_id: number;
  name: string;
  gender: 'male' | 'female' | 'unknown';
  birth_date: string | null;
  death_date: string | null;
  generation: number | null;
  generation_name: string | null;
  bio: string | null;
  avatar: string | null;
  branch_id: number | null;
  is_alive: boolean;
  created_at: string;
  updated_at: string;
  parents?: Member[];
  spouses?: Member[];
  courtesy_name?: string | null;
  art_name?: string | null;
  posthumous_name?: string | null;
  privacy_level?: string;
  privacy_override?: boolean;
  visibility?: string;
}

export interface Relationship {
  id: number;
  member_id: number;
  related_member_id: number;
  relationship_type: 'parent' | 'spouse' | 'sibling';
  member_name: string;
  related_member_name: string;
  created_at: string;
}

export interface FamilyTree {
  nodes: TreeNode[];
  edges: TreeEdge[];
  root_ids: number[];
  couples: CoupleEntry[];
}

export interface CoupleEntry {
  husband_id: number;
  wife_id: number | null;
  children: number[];
  sort_order: number;
  marriage_label?: string;
}

export interface TreeNode {
  id: number;
  name: string;
  gender: string;
  generation: number | null;
  generation_name: string | null;
  birth_date: string | null;
  death_date: string | null;
  avatar: string | null;
  bio: string | null;
  is_alive: boolean;
  branch_id?: number;
  courtesy_name?: string | null;
  art_name?: string | null;
  posthumous_name?: string | null;
}

export interface TreeEdge {
  id: number;
  source: number;
  target: number;
  type: 'parent' | 'spouse' | 'sibling';
}

export interface AuthResponse {
  message: string;
  user: User;
  access_token: string;
  refresh_token: string;
}

export interface FamilyMemberRole {
  id: number;
  family_id: number;
  user_id: number;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  joined_at: string;
}

export interface FamilyUser {
  id: number;
  user_id: number;
  username: string;
  display_name: string | null;
  avatar: string | null;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  joined_at: string;
}

export interface SearchUser {
  id: number;
  username: string;
  display_name: string | null;
  avatar: string | null;
}

// 辈分字派
export interface GenerationRule {
  id: number;
  family_id: number;
  generation: number;
  character: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

// 快速建家庭
export interface QuickFamilyRequest {
  father: {
    name: string;
    birth_date?: string;
    generation?: number;
    generation_name?: string;
    bio?: string;
    is_alive?: boolean;
  };
  mother?: {
    name: string;
    birth_date?: string;
    generation?: number;
    generation_name?: string;
    bio?: string;
    is_alive?: boolean;
  };
  children: Array<{
    name: string;
    gender?: string;
    birth_date?: string;
    generation?: number;
    is_alive?: boolean;
  }>;
}

export interface QuickFamilyResponse {
  message: string;
  father: Member;
  mother: Member | null;
  children: Member[];
}

// 导入结果
export interface ImportResult {
  message: string;
  added_count: number;
  error_count: number;
  errors: string[];
}

// 家族大事记
export interface FamilyEvent {
  id: number;
  family_id: number;
  title: string;
  description: string | null;
  event_date: string;
  event_type: string;
  location: string | null;
  related_member_ids: number[] | null;
  images: string[] | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

// 相册
export interface FamilyAlbum {
  id: number;
  family_id: number;
  name: string;
  description: string | null;
  cover_photo_id: number | null;
  cover_url: string | null;
  photo_count: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  photos?: FamilyPhoto[];
}

export interface FamilyPhoto {
  id: number;
  album_id: number;
  member_id: number | null;
  title: string | null;
  description: string | null;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: number;
  created_at: string;
}

// 审计日志
export interface AuditLog {
  id: number;
  family_id: number | null;
  user_id: number | null;
  username: string | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  description: string;
  ip_address: string | null;
  created_at: string;
}

export interface AuditLogStats {
  by_action: Record<string, number>;
  by_entity: Record<string, number>;
  daily: Array<{ date: string; count: number }>;
}

// 邀请
export interface Invitation {
  id: number;
  family_id: number;
  code: string;
  created_by: number;
  creator_name: string | null;
  role: string;
  max_uses: number;
  use_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

// 分支
export interface FamilyBranch {
  id: number;
  family_id: number;
  name: string;
  description: string | null;
  founder_id: number | null;
  founder_name: string | null;
  parent_branch_id: number | null;
  sort_order: number;
  member_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  children?: FamilyBranch[];
}

// 亲属关系计算结果
export interface KinshipResult {
  member1: { id: number; name: string };
  member2: { id: number; name: string };
  path: Array<{ from: number; to: number; type: string; direction: 'up' | 'down' | 'sideways' }>;
  relationship: string;
}

// 五服关系数据
export interface WufuData {
  member: { id: number; name: string };
  zancui: WufuMember[];    // 斩衰
  zicui: WufuMember[];      // 齐衰
  dagong: WufuMember[];     // 大功
  xiaogong: WufuMember[];   // 小功
  sima: WufuMember[];       // 缌麻
}

export interface WufuMember {
  id: number;
  name: string;
  gender: 'male' | 'female' | 'unknown';
  generation: number | null;
  relationship: string;
  path: Array<{ from: number; to: number; type: string; direction: string }>;
}

// 系统配置类型
export interface SystemConfig {
  id: number;
  category: 'user' | 'family' | 'content' | 'notification' | 'ui';
  key: string;
  value: string;
  value_type: 'boolean' | 'number' | 'string' | 'json';
  label: string;
  description: string | null;
  min_value: number | null;
  max_value: number | null;
  options: string | null;
  is_active: boolean;
  is_public: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// 审计日志类型
export interface AuditLog {
  id: number;
  family_id: number | null;
  user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  description: string | null;
  ip_address: string | null;
  created_at: string;
}

// 系统状态
export interface SystemStatus {
  users: { total: number; active: number; pending: number };
  families: { total: number };
  members: { total: number };
  configs: { total: number; categories: string[] };
}
