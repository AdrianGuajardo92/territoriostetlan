import React from 'react';
import * as lucideIcons from 'lucide-react';

// Componente de iconos reutilizable con Lucide React
const Icon = ({ name, size = 24, color = "currentColor", className = "", ...props }) => {
    // Mapeo de nombres personalizados a nombres de Lucide
    const iconMap = {
        'navigation': 'Navigation',
        'map': 'Map',
        'plus': 'Plus',
        'edit': 'Edit',
        'trash': 'Trash2',
        'x': 'X',
        'checkCircle': 'CheckCircle',
        'mapPin': 'MapPin',
        'user': 'User',
        'check': 'Check',
        'help': 'HelpCircle',
        'arrowRight': 'ArrowRight',
        'chevronRight': 'ChevronRight',
        'chevronLeft': 'ChevronLeft',
        'chevronDown': 'ChevronDown',
        'chevronUp': 'ChevronUp',
        'shield': 'Shield',
        'users': 'Users',
        'search': 'Search',
        'barChart': 'BarChart3',
        'checkSquare': 'CheckSquare',
        'activity': 'Activity',
        'fileText': 'FileText',
        'settings': 'Settings',
        'key': 'Key',
        'download': 'Download',
        'smartphone': 'Smartphone',
        'logOut': 'LogOut',
        'mail': 'Mail',
        'lock': 'Lock',
        'eye': 'Eye',
        'eyeOff': 'EyeOff',
        'alertCircle': 'AlertCircle',
        'menu': 'Menu',
        'filter': 'Filter',
        'home': 'Home',
        'calendar': 'Calendar',
        'clock': 'Clock',
        'phone': 'Phone',
        'messageSquare': 'MessageSquare',
        'info': 'Info',
        'star': 'Star',
        'refresh': 'RefreshCw',
        'save': 'Save',
        'copy': 'Copy',
        'share': 'Share2',
        'printer': 'Printer',
        'file': 'File',
        'folder': 'Folder',
        'image': 'Image',
        'video': 'Video',
        'link': 'Link',
        'externalLink': 'ExternalLink',
        'globe': 'Globe',
        'zoomIn': 'ZoomIn',
        'zoomOut': 'ZoomOut',
        'list': 'List',
        'grid': 'Grid',
        'layers': 'Layers',
        'bell': 'Bell',
        'bookmark': 'Bookmark',
        'heart': 'Heart',
        'moreVertical': 'MoreVertical',
        'moreHorizontal': 'MoreHorizontal',
        'send': 'Send',
        'upload': 'Upload',
        'wifi': 'Wifi',
        'wifiOff': 'WifiOff',
        'battery': 'Battery',
        'batteryLow': 'BatteryLow',
        'sun': 'Sun',
        'moon': 'Moon',
        'cloud': 'Cloud',
        'cloudRain': 'CloudRain',
        'wind': 'Wind',
        'flag': 'Flag',
        'tag': 'Tag',
        'hash': 'Hash',
        'dollarSign': 'DollarSign',
        'percent': 'Percent',
        'award': 'Award',
        'trophy': 'Trophy',
        'gift': 'Gift',
        'trendingUp': 'TrendingUp',
        'trendingDown': 'TrendingDown',
        'database': 'Database',
        'server': 'Server',
        'terminal': 'Terminal',
        'code': 'Code',
        'bug': 'Bug',
        'tool': 'Tool',
        'book': 'BookOpen',
        'bookOpen': 'BookOpen',
        'mapOff': 'MapPinOff',
        'searchX': 'SearchX',
        'uploadCloud': 'UploadCloud',
        'cloudOff': 'CloudOff',
        'rotateCcw': 'RotateCcw',
        'zap': 'Zap',
        'arrowLeft': 'ArrowLeft',
        'maximize': 'Maximize',
        'minimize': 'Minimize',
        'folderOpen': 'FolderOpen',
        'clipboard': 'Clipboard',
        'unlock': 'Unlock',
        'downloadCloud': 'DownloadCloud',
        'users-cog': 'Settings', // Mapear users-cog a Settings
        'times': 'X', // Mapear times a X
        'tools': 'Wrench', // Mapear tools a Wrench
        'refreshCw': 'RefreshCw', // Para el botón de actualización
        'alertTriangle': 'AlertTriangle', // Para notificaciones críticas
        'trending-up': 'TrendingUp', // Para métricas de eficiencia
        'lightbulb': 'Lightbulb', // Para insights y recomendaciones
        'chart-line': 'TrendingUp', // Alternativo para gráficos
        'user-slash': 'UserX' // Para publicadores inactivos
    };
    
    const iconName = iconMap[name] || name;
    const LucideIcon = lucideIcons[iconName];
    
    if (!LucideIcon) {
        console.warn(`Icon "${name}" not found`);
        return null;
    }
    
    return <LucideIcon size={size} color={color} className={className} {...props} />;
};

export default Icon; 