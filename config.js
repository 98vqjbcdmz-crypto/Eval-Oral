window.ORAL_API_BASE_URL = localStorage.getItem('oralApiBaseUrl')
  || (window.location.hostname === 'localhost' ? '' : 'http://localhost:3000');
