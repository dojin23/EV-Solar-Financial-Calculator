export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-8 pb-4 text-sm text-gray-600">
      <div className="container mx-auto px-4 text-center">
        <p>Made by Pipe Solar</p>
        <p>© {currentYear} Pipe Solar. All rights reserved.</p>
        <p>This tool is for informational purposes only.</p>
      </div>
    </footer>
  );
}
