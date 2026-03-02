interface BadgeProps {
  value: string;
  type: 'status' | 'priority' | 'severity' | 'type';
}

export default function Badge({ value, type }: BadgeProps) {
  return (
    <span className={`badge badge-${type}-${value.replace('_', '-')}`}>
      {value.replace('_', ' ')}
    </span>
  );
}
