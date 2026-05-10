const POSITION_COLORS = {
  base:       'bg-blue-900 text-blue-300',
  escolta:    'bg-purple-900 text-purple-300',
  alero:      'bg-green-900 text-green-300',
  'ala-pivot':'bg-yellow-900 text-yellow-300',
  pivot:      'bg-red-900 text-red-300',
}

const STATUS_COLORS = {
  ABIERTO:     'bg-green-900 text-green-300',
  CERRADO:     'bg-red-900 text-red-300',
  FINALIZADO:  'bg-gray-800 text-gray-400',
  EN_CURSO:    'bg-yellow-900 text-yellow-300',
  PROGRAMADO:  'bg-blue-900 text-blue-300',
}

export function Badge({ label, type = 'default', className = '' }) {
  const colorMap = { ...POSITION_COLORS, ...STATUS_COLORS }
  const color = colorMap[label?.toLowerCase?.()] || colorMap[label] || 'bg-gray-800 text-gray-300'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${color} ${className}`}>
      {label}
    </span>
  )
}
