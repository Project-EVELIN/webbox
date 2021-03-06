/**
 * Admin API
 */
import { commonErrorHandler, checkStatus, getDefaultHeaders, parseJSON } from './utils';


export const AdminAPI = {
  getUsers(query) {
    return fetch(`/api/users?page=${query.page}&limit=${query.limit}&q=${query.q}`, {
      credentials: 'same-origin',
      headers: getDefaultHeaders()
    })
      .then(checkStatus)
      .then(parseJSON)
      .then(data => {
        return data;
      })
      .catch(commonErrorHandler);
  },
  getUser(params) {
    return fetch(`/api/user/${params.id}`, {
      credentials: 'same-origin',
      headers: getDefaultHeaders()
    })
      .then(checkStatus)
      .then(parseJSON)
      .then(data => {
        return data;
      })
      .catch(commonErrorHandler);
  },
  saveUser(params, payload) {
    return fetch(`/api/user/${params.id}`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: getDefaultHeaders(),
      body: JSON.stringify(payload)
    })
      .then(checkStatus)
      .then(parseJSON)
      .then(data => {
        return data;
      })
      .catch(commonErrorHandler);
  },
  deleteUser(params) {
    return fetch(`/api/user/${params.id}`, {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: getDefaultHeaders()
    })
      .then(checkStatus)
      .then(parseJSON)
      .then(data => {
        return data;
      })
      .catch(commonErrorHandler);
  },
  unblockUser(params) {
    return fetch(`/api/unblockuser/${params.id}`, {
      credentials: 'same-origin',
      headers: getDefaultHeaders()
    })
      .then(checkStatus)
      .then(parseJSON)
      .then(data => {
        return data;
      })
      .catch(commonErrorHandler);
  },
  resetUserPasswordManually(params) {
    return fetch(`/api/user/${params.id}/resetPasswordManually`, {
      credentials: 'same-origin',
      headers: getDefaultHeaders()
    })
      .then(checkStatus)
      .then(parseJSON)
      .then(data => {
        return data;
      })
      .catch(commonErrorHandler);
  },
  resendConfirmationEmail(params) {
    return fetch(`/api/user/${params.id}/resendconfirmationemail`, {
      credentials: 'same-origin',
      headers: getDefaultHeaders()
    })
      .then(checkStatus)
      .then(parseJSON)
      .then(data => {
        return data;
      })
      .catch(commonErrorHandler);
  },
  confirmUser(params) {
    return fetch(`/api/user/${params.id}/confirmuser`, {
      credentials: 'same-origin',
      headers: getDefaultHeaders()
    })
      .then(checkStatus)
      .then(parseJSON)
      .then(data => {
        return data;
      })
      .catch(commonErrorHandler);
  },
  getCourses(query) {
    return fetch(`/api/courses?page=${query.page}&limit=${query.limit}&q=${query.q}`, {
      credentials: 'same-origin',
      headers: getDefaultHeaders()
    })
      .then(checkStatus)
      .then(parseJSON)
      .then(data => {
        return data;
      })
      .catch(commonErrorHandler);
  },
  getCourse(params) {
    return fetch(`/api/course/${params.id}`, {
      credentials: 'same-origin',
      headers: getDefaultHeaders()
    })
      .then(checkStatus)
      .then(parseJSON)
      .then(data => {
        return data;
      })
      .catch(commonErrorHandler);
  },
  saveCourse(params, payload) {
    return fetch(`/api/course/${params.id}`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: getDefaultHeaders(),
      body: JSON.stringify(payload)
    })
      .then(checkStatus)
      .then(parseJSON)
      .then(data => {
        return data;
      })
      .catch(commonErrorHandler);
  },
  deleteCourse(params) {
    return fetch(`/api/course/${params.id}`, {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: getDefaultHeaders()
    })
      .then(checkStatus)
      .then(parseJSON)
      .then(data => {
        return data;
      })
      .catch(commonErrorHandler);
  },
  getEmbeds(query) {
    return fetch(`/api/embeds?page=${query.page}&limit=${query.limit}&q=${query.q}`, {
      credentials: 'same-origin',
      headers: getDefaultHeaders()
    })
      .then(checkStatus)
      .then(parseJSON)
      .then(data => {
        return data;
      })
      .catch(commonErrorHandler);
  },
  getDocuments(query) {
    return fetch(`/api/documents?page=${query.page}&limit=${query.limit}&q=${query.q}`, {
      credentials: 'same-origin',
      headers: getDefaultHeaders()
    })
      .then(checkStatus)
      .then(parseJSON)
      .then(data => {
        return data;
      })
      .catch(commonErrorHandler);
  },
  getLogs(query) {
    return fetch(`/api/logs?page=${query.page}&limit=${query.limit}&q=${query.q}`, {
      credentials: 'same-origin',
      headers: getDefaultHeaders()
    })
      .then(checkStatus)
      .then(parseJSON)
      .then(data => {
        return data;
      })
      .catch(commonErrorHandler);
  },
  getAuthAttempts(query) {
    return fetch(`/api/authattempts?page=${query.page}&limit=${query.limit}`, {
      credentials: 'same-origin',
      headers: getDefaultHeaders()
    })
      .then(checkStatus)
      .then(parseJSON)
      .then(data => {
        return data;
      })
      .catch(commonErrorHandler);
  },
  deleteAllAuthAttempts() {
    return fetch(`/api/authattempts`, {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: getDefaultHeaders()
    })
      .then(checkStatus)
      .then(parseJSON)
      .then(data => {
        return data;
      })
      .catch(commonErrorHandler);
  },
  getRecyclebinEntries(query) {
    return fetch(`/api/recyclebin?page=${query.page}&limit=${query.limit}`, {
      credentials: 'same-origin',
      headers: getDefaultHeaders()
    })
      .then(checkStatus)
      .then(parseJSON)
      .then(data => {
        return data;
      })
      .catch(commonErrorHandler);
  },
  sendMail(payload) {
    return fetch(`/api/sendmail/`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: getDefaultHeaders(),
      body: JSON.stringify(payload)
    })
      .then(checkStatus)
      .then(parseJSON)
      .then(data => {
        return data;
      })
      .catch(commonErrorHandler);
  }
};
