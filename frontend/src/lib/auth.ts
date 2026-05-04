export function isGuestUser(): boolean {
  try {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    // Parse JWT without external libraries (just base64 decode the payload)
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const payload = JSON.parse(jsonPayload);
    return Boolean(payload.isGuest);
  } catch {
    return false;
  }
}
