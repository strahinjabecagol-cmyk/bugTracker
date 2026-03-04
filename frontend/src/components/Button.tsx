interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  children: React.ReactNode;
}

const CLASS: Record<string, string> = {
  primary:   'btn-skewed-primary',
  secondary: 'btn-skewed-secondary',
  danger:    'btn-skewed-danger',
  ghost:     'btn-logout',
};

export default function Button({ variant = 'primary', children, className, ...props }: ButtonProps) {
  const base = CLASS[variant];
  return (
    <button className={`${base}${className ? ` ${className}` : ''}`} {...props}>
      <span>{children}</span>
    </button>
  );
}
