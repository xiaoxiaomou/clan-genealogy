const API_BASE_URL = '/api';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

export interface MemorialReminder {
  member_id: number;
  member_name: string;
  family_id: number;
  family_name?: string;
  death_date: string;
  next_anniversary: string;
  days_until: number;
  generation: number;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  /** 期望的响应类型：'json'（默认）/ 'blob' / 'text' */
  responseType?: 'json' | 'blob' | 'text';
}

// ---- 401 自动刷新 token 逻辑 ----
let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];

function onTokenRefreshed(token: string | null) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string | null) => void) {
  refreshSubscribers.push(cb);
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token') || ''}`,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const newToken: string = data.access_token;
    localStorage.setItem('access_token', newToken);
    return newToken;
  } catch {
    return null;
  }
}

function redirectToLogin() {
  localStorage.removeItem('access_token');
  // 避免重复跳转
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
  _isRetry = false,
): Promise<T> {
  const { method = 'GET', body, headers = {}, responseType = 'json' } = options;

  const token = localStorage.getItem('access_token');

  const config: RequestInit = {
    method,
    headers: {
      ...(body && responseType === 'json' ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  // ---- 401 自动刷新 + 重试 ----
  if (response.status === 401 && !_isRetry && endpoint !== '/auth/refresh') {
    if (isRefreshing) {
      // 已有刷新请求在飞行中，等待它完成
      return new Promise<T>((resolve, reject) => {
        addRefreshSubscriber(async (newToken) => {
          if (!newToken) { reject(new Error('刷新 token 失败')); return; }
          try {
            const result = await request<T>(endpoint, options, true);
            resolve(result);
          } catch (e) { reject(e); }
        });
      });
    }
    isRefreshing = true;
    const newToken = await refreshAccessToken();
    isRefreshing = false;
    if (newToken) {
      onTokenRefreshed(newToken);
      return request<T>(endpoint, options, true);
    } else {
      onTokenRefreshed(null);
      redirectToLogin();
      throw new Error('登录已过期，请重新登录');
    }
  }

  if (!response.ok) {
    // 错误响应尽量解析 JSON 错误体，blob 错误体直接转文本
    let errorMessage = `请求失败: ${response.status}`;
    try {
      if (responseType === 'blob') {
        const text = await response.text();
        try {
          const data = JSON.parse(text);
          errorMessage = data?.error || data?.msg || errorMessage;
        } catch {
          errorMessage = text || errorMessage;
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        errorMessage = errorData?.error || errorData?.msg || errorMessage;
      }
    } catch {
      // 解析错误信息失败，保留默认 status 错误
    }
    throw new Error(errorMessage);
  }

  if (responseType === 'blob') {
    return (await response.blob()) as unknown as T;
  }
  if (responseType === 'text') {
    return (await response.text()) as unknown as T;
  }
  return response.json();
}

// Auth API
export const api = {
  // Auth endpoints
  login: (username: string, password: string) =>
    request<any>('/auth/login', {
      method: 'POST',
      body: { username, password },
    }),

  register: (username: string, email: string, password: string, display_name?: string) =>
    request<any>('/auth/register', {
      method: 'POST',
      body: { username, email, password, display_name },
    }),

  getProfile: () => request<any>('/auth/me'),

  updateProfile: (data: any) =>
    request<any>('/auth/me', { method: 'PUT', body: data }),

  changePassword: (old_password: string, new_password: string) =>
    request<any>('/auth/change-password', {
      method: 'POST',
      body: { old_password, new_password },
    }),

  refreshToken: () =>
    request<any>('/auth/refresh', { method: 'POST' }),

  // Family endpoints
  getFamilies: () => request<any>('/family/'),

  getFamily: (familyId: number) => request<any>(`/family/${familyId}`),

  createFamily: (data: any) =>
    request<any>('/family/', { method: 'POST', body: data }),

  updateFamily: (familyId: number, data: any) =>
    request<any>(`/family/${familyId}`, { method: 'PUT', body: data }),

  deleteFamily: (familyId: number) =>
    request<any>(`/family/${familyId}`, { method: 'DELETE' }),

  // Family Merge
  previewFamilyMerge: (targetId: number, sourceId: number) =>
    request<any>(`/family/${targetId}/merge/preview`, { method: 'POST', body: { source_family_id: sourceId } }),
  executeFamilyMerge: (targetId: number, sourceId: number, options: {
    field_strategy?: 'keep_target' | 'keep_source';
    member_strategy?: 'migrate_all' | 'skip_duplicate';
    delete_source?: boolean;
  }) =>
    request<any>(`/family/${targetId}/merge/execute`, {
      method: 'POST',
      body: { source_family_id: sourceId, ...options },
    }),

  // Member Edit History
  listMemberHistory: (familyId: number, memberId: number) =>
    request<any>(`/family/${familyId}/members/${memberId}/history`),
  rollbackMember: (familyId: number, memberId: number, batchId: string) =>
    request<any>(`/family/${familyId}/members/${memberId}/rollback/${batchId}`, { method: 'POST' }),
  deleteMemberHistory: (familyId: number, memberId: number, batchId: string) =>
    request<any>(`/family/${familyId}/members/${memberId}/history/${batchId}`, { method: 'DELETE' }),

  // Members
  getMembers: (familyId: number) =>
    request<any>(`/family/${familyId}/members`),

  getMember: (familyId: number, memberId: number) =>
    request<any>(`/family/${familyId}/members/${memberId}`),

  createMember: (familyId: number, data: any) =>
    request<any>(`/family/${familyId}/members`, { method: 'POST', body: data }),

  updateMember: (familyId: number, memberId: number, data: any) =>
    request<any>(`/family/${familyId}/members/${memberId}`, { method: 'PUT', body: data }),

  deleteMember: (familyId: number, memberId: number) =>
    request<any>(`/family/${familyId}/members/${memberId}`, { method: 'DELETE' }),

  addMember: (familyId: number, data: any) =>
    request<any>(`/family/${familyId}/members`, { method: 'POST', body: data }),

  // Relationships
  getRelationships: (familyId: number) =>
    request<any>(`/family/${familyId}/relationships`),

  createRelationship: (familyId: number, data: any) =>
    request<any>(`/family/${familyId}/relationships`, { method: 'POST', body: data }),

  addRelationship: (familyId: number, memberId: number, relatedMemberId: number, relationshipType: string) =>
    request<any>(`/family/${familyId}/relationships`, {
      method: 'POST',
      body: { member_id: memberId, related_member_id: relatedMemberId, relationship_type: relationshipType },
    }),

  deleteRelationship: (familyId: number, relationshipId: number) =>
    request<any>(`/family/${familyId}/relationships/${relationshipId}`, { method: 'DELETE' }),

  // Family tree
  getFamilyTree: (familyId: number) =>
    request<any>(`/family/${familyId}/tree`),

  getFamilyStats: (familyId: number) =>
    request<any>(`/family/${familyId}/stats`),

  getMyRole: (familyId: number) =>
    request<any>(`/family/${familyId}/my-role`),

  // Generations
  getGenerations: (familyId: number) =>
    request<any>(`/family/${familyId}/generations`),

  createGeneration: (familyId: number, data: any) =>
    request<any>(`/family/${familyId}/generations`, { method: 'POST', body: data }),

  updateGeneration: (familyId: number, ruleId: number, data: any) =>
    request<any>(`/family/${familyId}/generations/${ruleId}`, { method: 'PUT', body: data }),

  deleteGeneration: (familyId: number, ruleId: number) =>
    request<any>(`/family/${familyId}/generations/${ruleId}`, { method: 'DELETE' }),

  suggestGeneration: (familyId: number, generation: number) =>
    request<any>(`/family/${familyId}/generations/suggest?generation=${generation}`),

  quickAddFamily: (familyId: number, data: any) =>
    request<any>(`/family/${familyId}/quick-family`, { method: 'POST', body: data }),

  quickAddFamilyMulti: (familyId: number, data: { layers: any[] }) =>
    request<any>(`/family/${familyId}/quick-family-multi`, { method: 'POST', body: data }),

  importMembers: async (familyId: number, file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/family/${familyId}/import`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '导入失败');
    }

    return response.json();
  },

  // Branches
  getBranches: (familyId: number) =>
    request<any>(`/family/${familyId}/branches`),

  createBranch: (familyId: number, data: any) =>
    request<any>(`/family/${familyId}/branches`, { method: 'POST', body: data }),

  updateBranch: (familyId: number, branchId: number, data: any) =>
    request<any>(`/family/${familyId}/branches/${branchId}`, { method: 'PUT', body: data }),

  deleteBranch: (familyId: number, branchId: number) =>
    request<any>(`/family/${familyId}/branches/${branchId}`, { method: 'DELETE' }),

  // Events
  getEvents: (familyId: number) =>
    request<any>(`/family/${familyId}/events`),

  createEvent: (familyId: number, data: any) =>
    request<any>(`/family/${familyId}/events`, { method: 'POST', body: data }),

  updateEvent: (familyId: number, eventId: number, data: any) =>
    request<any>(`/family/${familyId}/events/${eventId}`, { method: 'PUT', body: data }),

  deleteEvent: (familyId: number, eventId: number) =>
    request<any>(`/family/${familyId}/events/${eventId}`, { method: 'DELETE' }),

  // Family Users
  getFamilyUsers: (familyId: number) =>
    request<any>(`/family/${familyId}/users`),

  addFamilyUser: (familyId: number, userId: number, role: string) =>
    request<any>(`/family/${familyId}/users`, { method: 'POST', body: { user_id: userId, role } }),

  updateFamilyUserRole: (familyId: number, userId: number, newRole: string) =>
    request<any>(`/family/${familyId}/users/${userId}`, { method: 'PUT', body: { role: newRole } }),

  removeFamilyUser: (familyId: number, userId: number) =>
    request<any>(`/family/${familyId}/users/${userId}`, { method: 'DELETE' }),

  // Album
  getAlbums: (familyId: number) =>
    request<any>(`/family/${familyId}/albums`),

  getAlbum: (familyId: number, albumId: number) =>
    request<any>(`/family/${familyId}/albums/${albumId}`),

  createAlbum: (familyId: number, data: any) =>
    request<any>(`/family/${familyId}/albums`, { method: 'POST', body: data }),

  updateAlbum: (familyId: number, albumId: number, data: any) =>
    request<any>(`/family/${familyId}/albums/${albumId}`, { method: 'PUT', body: data }),

  deleteAlbum: (familyId: number, albumId: number) =>
    request<any>(`/family/${familyId}/albums/${albumId}`, { method: 'DELETE' }),

  getAlbumPhotos: (familyId: number, albumId: number) =>
    request<any>(`/family/${familyId}/albums/${albumId}/photos`),

  deleteAlbumPhoto: (familyId: number, albumId: number, photoId: number) =>
    request<any>(`/family/${familyId}/albums/${albumId}/photos/${photoId}`, { method: 'DELETE' }),

  uploadPhoto: async (familyId: number, albumId: number, file: File, title?: string, description?: string): Promise<any> => {
    const formData = new FormData()
    formData.append('file', file)
    if (title) formData.append('title', title)
    if (description) formData.append('description', description)
    const token = localStorage.getItem('access_token')
    const response = await fetch(`${API_BASE_URL}/family/${familyId}/albums/${albumId}/photos`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || '上传照片失败')
    }
    return response.json()
  },

  deletePhoto: (familyId: number, albumId: number, photoId: number) =>
    request<any>(`/family/${familyId}/albums/${albumId}/photos/${photoId}`, { method: 'DELETE' }),

  // Invitations
  getInvitations: (familyId: number) =>
    request<any>(`/family/${familyId}/invitations`),

  createInvitation: (familyId: number, data: any) =>
    request<any>(`/family/${familyId}/invitations`, { method: 'POST', body: data }),

  deactivateInvitation: (familyId: number, inviteId: number) =>
    request<any>(`/family/${familyId}/invitations/${inviteId}`, { method: 'DELETE' }),

  joinViaInvitation: (code: string) =>
    request<any>('/family/join', { method: 'POST', body: { code } }),

  // Kinship
  calculateKinship: (familyId: number, member1Id: number, member2Id: number) =>
    request<any>(`/family/${familyId}/kinship/calculate`, {
      method: 'POST',
      body: { member1_id: member1Id, member2_id: member2Id },
    }),

  getKinshipPath: (familyId: number, member1Id: number, member2Id: number) =>
    request<any>(`/family/${familyId}/kinship/path?member1=${member1Id}&member2=${member2Id}`),

  // #4 关系计算引擎 - 一站式：称呼 + 共同祖先 + 血缘系数 + 路径
  getRelationship: (familyId: number, member1Id: number, member2Id: number) =>
    request<{
      member1: { id: number; name: string; gender?: string };
      member2: { id: number; name: string; gender?: string };
      path: Array<{
        from: { id: number; name: string };
        to: { id: number; name: string };
        relationship_type: string;
        direction: string;
      }>;
      path_node_ids: number[];
      path_edge_keys: string[];
      relationship: string;
      common_ancestors: Array<{ id: number; name: string; gender?: string }>;
      consanguinity: number;
      connected: boolean;
    }>(`/family/${familyId}/kinship/relation?member1=${member1Id}&member2=${member2Id}`),

  // #1 沙漏图 - 以某人为中心返回上N代祖先+下N代子孙
  getHourglassView: (
    familyId: number,
    memberId: number,
    options?: { ancestorDepth?: number; descendantDepth?: number; includeSiblings?: boolean }
  ) => {
    const params = new URLSearchParams();
    if (options?.ancestorDepth) params.set('ancestor_depth', String(options.ancestorDepth));
    if (options?.descendantDepth) params.set('descendant_depth', String(options.descendantDepth));
    if (options?.includeSiblings === false) params.set('include_siblings', 'false');
    const qs = params.toString();
    return request<{
      member: { id: number; name: string; generation: number };
      ancestor_depth: number;
      descendant_depth: number;
      ancestors: Array<{ id: number; name: string; generation: number }>;
      descendants: Array<{ id: number; name: string; generation: number }>;
      siblings: Array<{ id: number; name: string; generation: number }>;
      spouses: Array<{ id: number; name: string; generation: number }>;
      ancestor_ids: number[];
      descendant_ids: number[];
      sibling_ids: number[];
      spouse_ids: number[];
      ancestor_edge_keys: string[];
      descendant_edge_keys: string[];
      all_ids: number[];
    }>(`/family/${familyId}/kinship/hourglass/${memberId}${qs ? `?${qs}` : ''}`)
  },

  // A1 金线溯源/金扇繁衍 - 一次返回高亮所需的所有 ID 集合
  getLineageHighlight: (
    familyId: number,
    memberId: number,
    options?: { maxDepth?: number; includeSiblings?: boolean }
  ) => {
    const params = new URLSearchParams();
    if (options?.maxDepth) params.set('max_depth', String(options.maxDepth));
    if (options?.includeSiblings === false) params.set('include_siblings', 'false');
    const qs = params.toString();
    return request<{
      member: { id: number; name: string };
      ancestors: Array<{ id: number; name: string; generation: number }>;
      descendants: Array<{ id: number; name: string; generation: number }>;
      siblings: Array<{ id: number; name: string; generation: number }>;
      spouses: Array<{ id: number; name: string; generation: number }>;
      ancestor_ids: number[];
      descendant_ids: number[];
      sibling_ids: number[];
      spouse_ids: number[];
      ancestor_edge_keys: string[];
      descendant_edge_keys: string[];
      ancestor_chain: number[];
      descendant_chain: number[];
    }>(`/family/${familyId}/kinship/lineage/${memberId}${qs ? `?${qs}` : ''}`);
  },

  getWufuChart: (familyId: number, memberId: number) =>
    request<any>(`/family/${familyId}/wufu/${memberId}`),

  // Notifications
  getNotifications: () => request<any>('/notification/'),

  getUnreadCount: () => request<any>('/notification/unread-count'),

  markAsRead: (notificationId: number) =>
    request<any>(`/notification/${notificationId}/read`, { method: 'PUT' }),

  // Admin endpoints
  getPendingUsers: () => request<any>('/auth/admin/users/pending'),

  approveUser: (userId: number) =>
    request<any>(`/auth/admin/users/${userId}/approve`, { method: 'PUT' }),

  rejectUser: (userId: number) =>
    request<any>(`/auth/admin/users/${userId}/reject`, { method: 'PUT' }),

  getAllUsers: () => request<any>('/auth/admin/users'),

  disableUser: (userId: number) =>
    request<any>(`/auth/admin/users/${userId}/disable`, { method: 'PUT' }),

  enableUser: (userId: number) =>
    request<any>(`/auth/admin/users/${userId}/enable`, { method: 'PUT' }),

  getAuditLogs: (familyId?: number) =>
    request<any>(familyId ? `/family/${familyId}/audit` : '/family/audit'),

  // Config
  getConfigs: () => request<any>('/config/admin/config'),

  updateConfig: (key: string, value: string) =>
    request<any>(`/config/admin/config/${key}`, { method: 'PUT', body: { value } }),

  resetConfig: (category: string) =>
    request<any>('/config/admin/config/reset', { method: 'POST', body: { category } }),

  // Upload
  uploadAvatar: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/upload/avatar`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '上传失败');
    }

    return response.json();
  },

  uploadAlbumImage: async (familyId: number, file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/upload/album/${familyId}`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '上传失败');
    }

    return response.json();
  },

  // Search
  search: (familyId: number, query: string) =>
    request<any>(`/family/${familyId}/search?q=${encodeURIComponent(query)}`),

  // Export
  exportGedcom: async (familyId: number): Promise<void> => {
    try {
      const blob = await request<Blob>(
        `/export/${familyId}/export/gedcom`,
        { responseType: 'blob' },
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `family_${familyId}.ged`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : '网络异常，导出失败')
    }
  },

  exportGuzhiPdf: async (familyId: number): Promise<void> => {
    const blob = await request<Blob>(
      `/export/${familyId}/export/pdf/guzhi`,
      { responseType: 'blob' },
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `family_${familyId}_guzhi.pdf`
    a.click()
    URL.revokeObjectURL(url)
  },

  exportTraditionalPdf: async (familyId: number, style: 'su' | 'ou' | 'bao'): Promise<void> => {
    const token = localStorage.getItem('access_token')
    const response = await fetch(`${API_BASE_URL}/export/${familyId}/export/pdf/traditional?style=${style}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) throw new Error('导出失败')
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `family_${familyId}_${style}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  },

  exportPdf: async (familyId: number): Promise<void> => {
    const token = localStorage.getItem('access_token')
    const response = await fetch(`${API_BASE_URL}/export/${familyId}/export/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) throw new Error('导出失败')
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `family_${familyId}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  },

  exportMembersCsv: async (familyId: number): Promise<void> => {
    const token = localStorage.getItem('access_token')
    const response = await fetch(`${API_BASE_URL}/export/${familyId}/export/members/csv`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
    if (!response.ok) throw new Error('导出 CSV 失败')
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'members.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  },

  exportMembersExcel: async (familyId: number): Promise<void> => {
    const token = localStorage.getItem('access_token')
    const response = await fetch(`${API_BASE_URL}/export/${familyId}/export/members/excel`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
    if (!response.ok) throw new Error('导出 Excel 失败')
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'members.xlsx'
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  },

  downloadTemplate: async (familyId: number, format: 'excel' | 'csv'): Promise<void> => {
    const token = localStorage.getItem('access_token')
    const response = await fetch(`${API_BASE_URL}/family/${familyId}/template/${format}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
    if (!response.ok) throw new Error('下载模板失败')
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = format === 'excel' ? 'member_import_template.xlsx' : 'member_import_template.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  },

  // Family Articles
  getFamilyArticles: (familyId: number) =>
    request<any>(`/family/${familyId}/articles`),

  getAllFamilyArticles: (familyId: number) =>
    request<any>(`/family/${familyId}/articles/all`),

  createFamilyArticle: (familyId: number, data: any) =>
    request<any>(`/family/${familyId}/articles`, { method: 'POST', body: data }),

  updateFamilyArticle: (familyId: number, articleId: number, data: any) =>
    request<any>(`/family/${familyId}/articles/${articleId}`, { method: 'PUT', body: data }),

  deleteFamilyArticle: (familyId: number, articleId: number) =>
    request<any>(`/family/${familyId}/articles/${articleId}`, { method: 'DELETE' }),

  updateFamilyIntro: (familyId: number, data: any) =>
    request<any>(`/family/${familyId}/intro`, { method: 'PUT', body: data }),

  getBoundUser: (familyId: number, memberId: number) =>
    request<any>(`/family/${familyId}/members/${memberId}/bound-user`),

  bindUserToMember: (familyId: number, memberId: number, userId: number) =>
    request<any>(`/family/${familyId}/members/${memberId}/bound-user`, {
      method: 'PUT',
      body: { user_id: userId },
    }),

  unbindUserFromMember: (familyId: number, memberId: number) =>
    request<any>(`/family/${familyId}/members/${memberId}/bound-user`, {
      method: 'DELETE',
    }),

  getMyLinkedMember: (familyId: number) =>
    request<any>(`/family/${familyId}/my-linked-member`),

  bindSelfToMember: (familyId: number, memberId: number | null) =>
    request<any>(`/family/${familyId}/my-linked-member`, {
      method: 'PUT',
      body: { member_id: memberId },
    }),

  getFamilyPublic: (familyId: number) =>
    request<any>(`/family/${familyId}/public`),

  getPublicFamilyTree: (familyId: number) =>
    request<any>(`/family/${familyId}/public/tree`),

  getPublicIntro: (familyId: number) =>
    request<any>(`/family/${familyId}/public/intro`),

  getPublicArticles: (familyId: number) =>
    request<any>(`/family/${familyId}/public/articles`),

  getPublicStats: (familyId: number) =>
    request<any>(`/family/${familyId}/public/stats`),

  requestPasswordReset: (email: string) =>
    request<any>('/auth/forgot-password', { method: 'POST', body: { email } }),

  resetPassword: (token: string, new_password: string) =>
    request<any>('/auth/reset-password', { method: 'POST', body: { token, new_password } }),

  verifyResetToken: (token: string) =>
    request<any>(`/auth/reset-password/verify?token=${encodeURIComponent(token)}`),

  adminCreateBackup: () =>
    request<any>('/admin/backup/create', { method: 'POST' }),

  adminListBackups: () =>
    request<any>('/admin/backup'),

  adminRestoreBackup: (backup_id: number) =>
    request<any>('/admin/backup/restore', { method: 'POST', body: { backup_id } }),

  adminDownloadBackup: (backup_id: number) =>
    request<any>(`/admin/backup/${backup_id}/download`),

  adminDeleteBackup: (backup_id: number) =>
    request<any>(`/admin/backup/${backup_id}`, { method: 'DELETE' }),

  adminIntegrityCheck: () =>
    request<any>('/admin/integrity/check', { method: 'POST' }),

  adminBatchDeleteMembers: (family_id: number, member_ids: number[]) =>
    request<any>(`/family/${family_id}/members/batch-delete`, {
      method: 'POST',
      body: { member_ids },
    }),

  adminBatchAssignBranch: (family_id: number, member_ids: number[], branch_id: number | null) =>
    request<any>(`/family/${family_id}/members/batch-assign-branch`, {
      method: 'POST',
      body: { member_ids, branch_id },
    }),

  adminListRecycleBin: (family_id?: number) =>
    request<any>(family_id ? `/family/${family_id}/recycle-bin` : '/admin/recycle-bin'),

  adminRestoreFromRecycle: (recycle_id: number) =>
    request<any>(`/admin/recycle-bin/${recycle_id}/restore`, { method: 'POST' }),

  adminPurgeRecycle: (recycle_id: number) =>
    request<any>(`/admin/recycle-bin/${recycle_id}`, { method: 'DELETE' }),

  // Memorial (祭日/忌日)
  getTodayMemorial: (familyId: number) =>
    request<any>(`/family/${familyId}/memorial/today`),
  getUpcomingMemorial: (familyId: number, days = 60) =>
    request<any>(`/family/${familyId}/memorial/upcoming?days=${days}`),
  getThisMonthMemorial: (familyId: number) =>
    request<any>(`/family/${familyId}/memorial/this-month`),
  getAllMemorial: (familyId: number) =>
    request<any>(`/family/${familyId}/memorial/all`),

  // Memorial Reminders (祭日提醒)
  listMemorialReminders: (familyId: number, days = 90) =>
    request<{ days_ahead: number; total: number; items: MemorialReminder[] }>(
      `/family/${familyId}/memorial-reminders?days=${days}`,
    ),
  triggerMemorialCheck: () =>
    request<{ message: string }>('/family/memorial-reminders/run', { method: 'POST' }),

  // AI OCR
  importOcrResult: (familyId: number, data: any) =>
    request<any>(`/family/${familyId}/ocr/import`, { method: 'POST', body: data }),

  // 字辈诗
  getZibei: (familyId: number) =>
    request<any>(`/family/${familyId}/zibei`),
  updateZibei: (familyId: number, data: any) =>
    request<any>(`/family/${familyId}/zibei`, { method: 'PUT', body: data }),
  suggestZibeiNames: (familyId: number, data: { surname: string; generation: number; gender: string; count?: number }) =>
    request<any>(`/family/${familyId}/zibei/suggest-names`, { method: 'POST', body: data }),
  checkZibeiCompliance: (familyId: number, data: { name: string; generation: number }) =>
    request<any>(`/family/${familyId}/zibei/check`, { method: 'POST', body: data }),

  // 世系图（苏/欧/宝塔式）
  getLineageChart: (familyId: number, style: 'su' | 'ou' | 'baota', rootMemberId?: number) => {
    const params = new URLSearchParams({ style })
    if (rootMemberId) params.set('root_member_id', String(rootMemberId))
    return request<any>(`/family/${familyId}/tree/lineage?${params.toString()}`)
  },

  // 旁系图
  getCousinTree: (familyId: number, rootMemberId: number, depth = 3) =>
    request<any>(`/family/${familyId}/tree/cousin?root_member_id=${rootMemberId}&depth=${depth}`),

  // 历史事实索引
  listHistoricalEvents: (familyId: number) =>
    request<any>(`/family/${familyId}/history`),
  createHistoricalEvent: (familyId: number, data: any) =>
    request<any>(`/family/${familyId}/history`, { method: 'POST', body: data }),
  updateHistoricalEvent: (familyId: number, eventId: number, data: any) =>
    request<any>(`/family/${familyId}/history/${eventId}`, { method: 'PUT', body: data }),
  deleteHistoricalEvent: (familyId: number, eventId: number) =>
    request<any>(`/family/${familyId}/history/${eventId}`, { method: 'DELETE' }),

  // 功德榜
  listHonors: (familyId: number) =>
    request<any>(`/family/${familyId}/honors`),
  createHonor: (familyId: number, data: any) =>
    request<any>(`/family/${familyId}/honors`, { method: 'POST', body: data }),
  updateHonor: (familyId: number, honorId: number, data: any) =>
    request<any>(`/family/${familyId}/honors/${honorId}`, { method: 'PUT', body: data }),
  deleteHonor: (familyId: number, honorId: number) =>
    request<any>(`/family/${familyId}/honors/${honorId}`, { method: 'DELETE' }),

  // 家族动态
  listPosts: (familyId: number) =>
    request<any>(`/family/${familyId}/posts`),
  createPost: (familyId: number, data: any) =>
    request<any>(`/family/${familyId}/posts`, { method: 'POST', body: data }),
  updatePost: (familyId: number, postId: number, data: any) =>
    request<any>(`/family/${familyId}/posts/${postId}`, { method: 'PUT', body: data }),
  deletePost: (familyId: number, postId: number) =>
    request<any>(`/family/${familyId}/posts/${postId}`, { method: 'DELETE' }),
  likePost: (familyId: number, postId: number) =>
    request<any>(`/family/${familyId}/posts/${postId}/like`, { method: 'POST' }),
  listPostComments: (familyId: number, postId: number) =>
    request<any>(`/family/${familyId}/posts/${postId}/comments`),
  createPostComment: (familyId: number, postId: number, data: any) =>
    request<any>(`/family/${familyId}/posts/${postId}/comments`, { method: 'POST', body: data }),
  deletePostComment: (familyId: number, postId: number, commentId: number) =>
    request<any>(`/family/${familyId}/posts/${postId}/comments/${commentId}`, { method: 'DELETE' }),
  searchMentionable: (familyId: number, q: string) =>
    request<{ items: Array<{ id: number; username: string; display_name: string; avatar: string | null }> }>(
      `/family/${familyId}/mentions/search?q=${encodeURIComponent(q)}`,
    ),

  // 家族聊天
  listChatGroups: (familyId: number) =>
    request<any>(`/family/${familyId}/chat/groups`),
  createChatGroup: (familyId: number, data: any) =>
    request<any>(`/family/${familyId}/chat/groups`, { method: 'POST', body: data }),
  listChatMessages: (familyId: number, groupId: number, since?: number) =>
    request<any>(`/family/${familyId}/chat/groups/${groupId}/messages${since ? `?since=${since}` : ''}`),
  sendChatMessage: (familyId: number, groupId: number, content: string) =>
    request<any>(`/family/${familyId}/chat/groups/${groupId}/messages`, { method: 'POST', body: { content } }),
  createDMChannel: (familyId: number, peerUserId: number) =>
    request<any>(`/family/${familyId}/chat/dm`, { method: 'POST', body: { peer_user_id: peerUserId } }),

  // 理事会 / 家庙
  getCouncil: (familyId: number) =>
    request<any>(`/family/${familyId}/council`),
  getTemple: (familyId: number) =>
    request<any>(`/family/${familyId}/temple`),

  // 全局命令面板搜索
  globalSearch: (q: string, familyId?: number | null, limit = 8) => {
    const params = new URLSearchParams({ q, limit: String(limit) });
    if (familyId) params.set('family_id', String(familyId));
    return request<any>(`/search/global?${params.toString()}`);
  },
  quickActions: () => request<any>('/search/actions'),
  recentSearches: () => request<any>('/search/recent'),

  // 批量编辑成员
  batchEditMembers: (familyId: number, data: {
    member_ids: (number | string)[]
    updates: Record<string, any>
    mode?: 'set' | 'append'
  }) => request<any>(`/family/${familyId}/members/batch-edit`, { method: 'POST', body: data }),
  batchDeleteMembers: (familyId: number, memberIds: (number | string)[]) =>
    request<any>(`/family/${familyId}/members/batch-delete`, { method: 'POST', body: { member_ids: memberIds } }),
  batchSortMembers: (familyId: number, orders: Array<{ id: number; sort_order: number }>) =>
    request<any>(`/family/${familyId}/members/batch-sort`, { method: 'POST', body: { orders } }),
  importMembersCsv: (familyId: number, data: {
    csv_text: string
    dry_run?: boolean
    skip_header?: boolean
  }) => request<any>(`/family/${familyId}/members/import-csv`, { method: 'POST', body: data }),

  importMembersExcel: (familyId: number, file: File, dryRun: boolean = true) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('dry_run', String(dryRun))
    return request<any>(`/family/${familyId}/import/excel`, {
      method: 'POST',
      body: formData,
      headers: {},
    })
  },

  getGenerationStatistics: (familyId: number) =>
    request<{
      total: number
      alive_count: number
      dead_count: number
      generation_names: Array<{ generation_name: string; count: number }>
      generation_distribution: Array<{ generation: number; count: number }>
      generation_gender: Array<{ generation: number; gender: string; count: number }>
    }>(`/family/${familyId}/members/statistics/generations`),

  downloadBackup: async (familyId: number): Promise<void> => {
    const token = localStorage.getItem('access_token')
    const response = await fetch(`${API_BASE_URL}/family/${familyId}/export/backup`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
    if (!response.ok) throw new Error('备份下载失败')
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `zupu_backup_${familyId}.zip`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  },

  // 公开分享链接（管理）
  createShareLink: (familyId: number, data: { label?: string; password?: string; expires_in_days?: number }) =>
    request<any>(`/family/${familyId}/share-links`, { method: 'POST', body: data }),
  listShareLinks: (familyId: number) =>
    request<any>(`/family/${familyId}/share-links`),
  revokeShareLink: (familyId: number, linkId: number) =>
    request<any>(`/family/${familyId}/share-links/${linkId}`, { method: 'DELETE' }),
  deleteShareLink: (familyId: number, linkId: number) =>
    request<any>(`/family/${familyId}/share-links/${linkId}/hard`, { method: 'DELETE' }),
  // 公开访问
  shareLinkInfo: (token: string) => request<any>(`/share/${token}/info`),
  accessShareLink: (token: string, password?: string) =>
    request<any>(`/share/${token}`, { method: 'POST', body: { password } }),
  askAI: (familyId: number, question: string) =>
    request<{ answer: string; mode: string; model: string }>(
      `/family/${familyId}/ai/ask`,
      { method: 'POST', body: { question } }
    ),

  // 示例数据集
  listSampleDatasets: () =>
    request<{ datasets: Array<{ key: string; name: string; description: string; surname: string; origin: string; member_count: number; generation_count: number }> }>('/family/sample-datasets'),
  loadSampleData: (familyId: number, datasetKey: string) =>
    request<{ message: string; member_count: number; relationship_count: number; dataset_name: string }>(
      `/family/${familyId}/load-sample`,
      { method: 'POST', body: { dataset_key: datasetKey } }
    ),
};
