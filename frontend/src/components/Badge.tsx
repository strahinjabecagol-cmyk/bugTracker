interface BadgeProps {
  value: string;
  type: 'status' | 'priority' | 'severity' | 'type' | 'quadrant';
}

export default function Badge({ value, type }: BadgeProps) {
  const slug = value.replace(/_/g, '-').replace(/ /g, '-').toLowerCase();
  const label = value.replace(/_/g, ' ');
  return (
    <span className={`badge badge-${type}-${slug}`}>
      <span>{label}</span>
    </span>
  );
}
