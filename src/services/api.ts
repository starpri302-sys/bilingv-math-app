const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const text = await res.text();
    console.error('API error response:', text);
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
    }
    throw new Error(json.error || `Error ${res.status}: ${res.statusText}`);
  }
  return res.json();
};

const getAuthHeader = () => {
  const token = localStorage.getItem('auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const api = {
  async register(data: any) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  async login(data: any) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  async getMe(token: string) {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(res);
  },
  async updateUserRole(userId: string, role: string, adminRole: string) {
    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, admin_role: adminRole })
    });
    return handleResponse(res);
  },
  async getUsers(id: string) {
    const res = await fetch(`/api/users/${id}`);
    return handleResponse(res);
  },
  async getAllUsers() {
    const res = await fetch('/api/admin/users');
    return handleResponse(res);
  },
  async resetUserPassword(userId: string, adminRole: string) {
    const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_role: adminRole })
    });
    return handleResponse(res);
  },
  async deleteUser(id: string) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },
  async saveUser(user: any) {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(user)
    });
    return handleResponse(res);
  },
  async getSubjects() {
    const res = await fetch('/api/subjects');
    return handleResponse(res);
  },
  async saveSubject(subject: any, userRole?: string) {
    const res = await fetch('/api/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...subject, user_role: userRole })
    });
    return handleResponse(res);
  },
  async deleteSubject(id: string, userRole?: string) {
    const res = await fetch(`/api/subjects/${id}?user_role=${userRole}`, { method: 'DELETE' });
    return handleResponse(res);
  },
  async getLanguages() {
    const res = await fetch('/api/languages');
    return handleResponse(res);
  },
  async saveLanguage(lang: any, userRole?: string) {
    const res = await fetch('/api/languages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...lang, user_role: userRole })
    });
    return handleResponse(res);
  },
  async deleteLanguage(code: string, userRole?: string) {
    const res = await fetch(`/api/languages/${code}?user_role=${userRole}`, { method: 'DELETE' });
    return handleResponse(res);
  },
  async getTerms(filters?: { status?: string; subjectId?: string; grade?: string; createdBy?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.subjectId) params.append('subjectId', filters.subjectId);
    if (filters?.grade) params.append('grade', filters.grade);
    if (filters?.createdBy) params.append('createdBy', filters.createdBy);
    
    const res = await fetch(`/api/terms?${params.toString()}`);
    return handleResponse(res);
  },
  async getTerm(id: string) {
    const res = await fetch(`/api/terms/${id}`);
    return handleResponse(res);
  },
  async createTerm(term: any, userRole?: string) {
    const res = await fetch('/api/terms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ ...term, user_role: userRole })
    });
    return handleResponse(res);
  },
  async updateTerm(id: string, term: any, userInfo?: { uid: string; username: string; role: string }) {
    const res = await fetch(`/api/terms/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ 
        ...term, 
        user_id: userInfo?.uid, 
        username: userInfo?.username, 
        user_role: userInfo?.role 
      })
    });
    return handleResponse(res);
  },
  async updateTermStatus(id: string, status: string, userRole?: string) {
    const res = await fetch(`/api/terms/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ status, user_role: userRole })
    });
    return handleResponse(res);
  },
  async deleteTerm(id: string) {
    const res = await fetch(`/api/terms/${id}`, { 
      method: 'DELETE',
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },
  async getComments(termId: string) {
    const res = await fetch(`/api/terms/${termId}/comments`);
    return handleResponse(res);
  },
  async addComment(termId: string, comment: any) {
    const res = await fetch(`/api/terms/${termId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(comment)
    });
    return handleResponse(res);
  },
  async generateNewPassword(token: string) {
    const res = await fetch('/api/users/me/generate-password', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });
    return handleResponse(res);
  },
  async changePassword(token: string, data: any) {
    const res = await fetch('/api/users/me/password', {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  async forgotPassword(email: string) {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return handleResponse(res);
  },
  async resetPassword(token: string, password: any) {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password })
    });
    return handleResponse(res);
  },
  async getAdminLogs(userRole: string) {
    const res = await fetch(`/api/admin/logs?user_role=${userRole}`);
    return handleResponse(res);
  },
  async getNotifications(userId: string) {
    const res = await fetch(`/api/notifications/${userId}`);
    return handleResponse(res);
  },
  async markNotificationRead(id: string) {
    const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    return handleResponse(res);
  },
  async deleteNotification(id: string) {
    const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
    return handleResponse(res);
  },
  async downloadBackup(userRole: string) {
    window.location.href = `/api/admin/backup?user_role=${userRole}`;
  },
  async exportTerms(userRole: string) {
    const res = await fetch(`/api/admin/export-terms?user_role=${userRole}`);
    return handleResponse(res);
  },
  async importTerms(userRole: string, data: any) {
    const res = await fetch('/api/admin/import-terms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_role: userRole, data })
    });
    return handleResponse(res);
  }
};
