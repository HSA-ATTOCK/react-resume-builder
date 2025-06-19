export default function LoadingSpinner({
  type = "full-page", // 'full-page' | 'inline'
  size = "md", // 'sm' | 'md' | 'lg'
  color = "blue", // 'blue' | 'gray' | 'white' | 'primary'
  withText = false,
  overlayOpacity = 80, // 0-100
}) {
  // Size configurations
  const sizes = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };

  // Color configurations
  const colors = {
    blue: {
      primary: "bg-blue-600",
      border: "border-blue-500",
    },
    gray: {
      primary: "bg-gray-600",
      border: "border-gray-500",
    },
    white: {
      primary: "bg-white",
      border: "border-white",
    },
    primary: {
      primary: "bg-indigo-600",
      border: "border-indigo-500",
    },
  };

  // Full-page spinner with bouncing dots
  if (type === "full-page") {
    return (
      <div
        className={`fixed inset-0 flex flex-col items-center justify-center bg-white bg-opacity-${overlayOpacity} z-50`}
        role="status"
      >
        <div className="flex space-x-2 mb-4">
          {[0.3, 0.15, 0].map((delay) => (
            <div
              key={delay}
              className={`w-4 h-4 rounded-full animate-bounce ${colors[color].primary}`}
              style={{ animationDelay: `-${delay}s` }}
            />
          ))}
        </div>
        {withText && (
          <span className="text-gray-600 font-medium">Loading...</span>
        )}
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  // Inline spinner
  return (
    <div className="flex items-center justify-center" role="status">
      <div
        className={`animate-spin rounded-full border-t-2 border-b-2 ${colors[color].border} ${sizes[size]}`}
      />
      {withText && <span className="ml-2 text-gray-600">Loading...</span>}
      <span className="sr-only">Loading...</span>
    </div>
  );
}
