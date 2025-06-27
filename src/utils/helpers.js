// Funciones de utilidad para formatear fechas y texto

export const formatDate = (date, options = {}) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    
    if (isNaN(d.getTime())) return 'Fecha inválida';
    
    const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...options
    };
    
    return d.toLocaleDateString('es-MX', defaultOptions);
};

export const formatShortDate = (date) => {
    return formatDate(date, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
};

export const formatRelativeTime = (date) => {
    if (!date) return null;
    const d = date.toDate ? date.toDate() : new Date(date);
    if (isNaN(d.getTime())) return 'Fecha inválida';
    
    const now = new Date();
    const diff = now - d;
    
    const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30.44);
    const years = Math.floor(days / 365.25);
    
    if (years > 0) return rtf.format(-years, 'year');
    if (months > 0) return rtf.format(-months, 'month');
    if (days > 0) return rtf.format(-days, 'day');
    if (hours > 0) return rtf.format(-hours, 'hour');
    if (minutes > 0) return rtf.format(-minutes, 'minute');
    return 'Hace unos segundos';
};

export const normalizeText = (text) => {
    if (!text) return '';
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .trim();
}; 