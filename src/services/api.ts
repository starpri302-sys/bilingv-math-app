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
  async getAcademicRequests(userRole: string) {
    const res = await fetch(`/api/academic-requests?user_role=${userRole}`, {
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },
  async submitAcademicRequest(data: { full_name: string, school: string, position: string, subjects: string }) {
    const res = await fetch('/api/academic-requests', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  async updateAcademicRequestStatus(id: string, status: 'approved' | 'rejected', userRole: string) {
    const res = await fetch(`/api/academic-requests/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeader(),
      body: JSON.stringify({ status, user_role: userRole })
    });
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
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(comment)
    });
    return handleResponse(res);
  },
  async deleteComment(termId: string, commentId: string) {
    const res = await fetch(`/api/terms/${termId}/comments/${commentId}`, {
      method: 'DELETE',
      headers: getAuthHeader()
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
  async forgotPassword(email: string) {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return handleResponse(res);
  },
  async resetPassword(email: string, token: string, newPassword: any) {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token, newPassword })
    });
    return handleResponse(res);
  },
  async getAdminLogs(userRole: string) {
    const res = await fetch(`/api/admin/logs?user_role=${userRole}`);
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
  },
  async getFavorites() {
    const res = await fetch('/api/favorites', {
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },
  async toggleFavorite(termId: string, isFavorite: boolean) {
    const res = await fetch(`/api/favorites/${termId}`, {
      method: isFavorite ? 'DELETE' : 'POST',
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },
  async getFavoriteStatus(termId: string) {
    const res = await fetch(`/api/favorites/${termId}/status`, {
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },
  async getCourses() {
    const res = await fetch('/api/courses');
    return handleResponse(res);
  },
  async getCourseLectures(courseId: string) {
    const res = await fetch(`/api/courses/${courseId}/lectures`);
    return handleResponse(res);
  },
  async getLecture(id: string) {
    const res = await fetch(`/api/lectures/${id}`, {
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },
  async getLectureComments(lectureId: string) {
    const res = await fetch(`/api/lectures/${lectureId}/comments`);
    return handleResponse(res);
  },
  async addLectureComment(lectureId: string, content: string) {
    const res = await fetch(`/api/lectures/${lectureId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ content })
    });
    return handleResponse(res);
  },
  async deleteLectureComment(lectureId: string, commentId: string) {
    const res = await fetch(`/api/lectures/${lectureId}/comments/${commentId}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },
  async getLectureQuiz(lectureId: string) {
    const res = await fetch(`/api/lectures/${lectureId}/quiz`);
    return handleResponse(res);
  },
  async saveLectureQuiz(lectureId: string, quizData: any) {
    const res = await fetch(`/api/lectures/${lectureId}/quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(quizData)
    });
    return handleResponse(res);
  },
  async completeLecture(lectureId: string, data: { score?: number; max_score?: number }) {
    const res = await fetch(`/api/lectures/${lectureId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  async getUserProgress() {
    const res = await fetch('/api/users/me/progress', {
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },
  async getUserDiary() {
    const res = await fetch('/api/users/me/diary', {
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },
  async getCourseStats(courseId: string) {
    const res = await fetch(`/api/courses/${courseId}/stats`, {
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },
  async createCourse(data: any) {
    const res = await fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  async updateCourse(id: string, data: any) {
    const res = await fetch(`/api/courses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  async deleteCourse(id: string) {
    const res = await fetch(`/api/courses/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },
  async createLecture(data: any) {
    const res = await fetch('/api/lectures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  async updateLecture(id: string, data: any) {
    const res = await fetch(`/api/lectures/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  async deleteLecture(id: string) {
    const res = await fetch(`/api/lectures/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },
  // +++ EDUCATIONAL MODULES API +++
  async getModules(courseId: string) {
    const res = await fetch(`/api/courses/${courseId}/modules`);
    return handleResponse(res);
  },
  async createModule(courseId: string, data: any) {
    const res = await fetch(`/api/courses/${courseId}/modules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  async updateModule(id: string, data: any) {
    const res = await fetch(`/api/modules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  async deleteModule(id: string) {
    const res = await fetch(`/api/modules/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },
  // +++ LECTURE RESOURCES API +++
  async getLectureResources(lectureId: string) {
    const res = await fetch(`/api/lectures/${lectureId}/resources`);
    return handleResponse(res);
  },
  async addLectureResource(lectureId: string, data: any) {
    const res = await fetch(`/api/lectures/${lectureId}/resources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  async deleteLectureResource(id: string) {
    const res = await fetch(`/api/resources/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },
  async saveLectureResources(lectureId: string, resources: any[]) {
    const res = await fetch(`/api/lectures/${lectureId}/resources/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ resources })
    });
    return handleResponse(res);
  },
  // +++ CLASSES & ENROLLMENT API +++
  async getClasses() {
    const res = await fetch('/api/classes', {
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },
  async createClass(data: any) {
    const res = await fetch('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  async updateClass(id: string, data: any) {
    const res = await fetch(`/api/classes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  async deleteClass(id: string) {
    const res = await fetch(`/api/classes/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },
  async joinClass(inviteCode: string) {
    const res = await fetch('/api/classes/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ inviteCode })
    });
    return handleResponse(res);
  },
  async getClassStudents(classId: string) {
    const res = await fetch(`/api/classes/${classId}/students`, {
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },
  async getClassProgress(classId: string) {
    const res = await fetch(`/api/classes/${classId}/progress`, {
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },
  // +++ ASSIGNMENTS API +++
  async getClassAssignments(classId: string) {
    const res = await fetch(`/api/classes/${classId}/assignments`, {
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },
  async createAssignment(classId: string, data: any) {
    const res = await fetch(`/api/classes/${classId}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  async submitAssignment(assignmentId: string) {
    const res = await fetch(`/api/assignments/${assignmentId}/submit`, {
      method: 'POST',
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },
  // +++ TEACHER DASHBOARD API +++
  async getTeacherDashboard() {
    const res = await fetch('/api/teacher/dashboard', {
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },
  async grantLectureAccess(lectureId: string, userId: string, expiresAt?: string) {
    const res = await fetch(`/api/lectures/${lectureId}/access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ userId, expiresAt })
    });
    return handleResponse(res);
  },
  async revokeLectureAccess(lectureId: string, userId: string) {
    const res = await fetch(`/api/lectures/${lectureId}/access/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },
  async getNotifications(userId: string) {
    const res = await fetch(`/api/notifications/${userId}`, {
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },
  async markNotificationAsRead(notificationId: string) {
    const res = await fetch(`/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: getAuthHeader()
    });
    return handleResponse(res);
  }
};
