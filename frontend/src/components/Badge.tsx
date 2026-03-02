interface BadgeProps {
  value: string;
  type: 'status' | 'priority' | 'severity' | 'type';
}

export default function Badge({ value, type }: BadgeProps) {
  return (
    <span className={`badge badge-${type}-${value.replace('_', '-')}`}>
      <span>{value.replace('_', ' ')}</span>
    </span>
  );
}
