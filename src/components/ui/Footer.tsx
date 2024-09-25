import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-12 pb-4">
      <div className="container mx-auto px-4">
        <div className="
          bg-gradient-to-r from-blue-500 to-green-500 
          hover:from-green-500 hover:to-blue-500
          rounded-full shadow-lg 
          transition-all duration-300 ease-in-out
          hover:scale-105 hover:shadow-xl
        ">
          <Link 
            href="https://pipe.solar" 
            target="_blank" 
            rel="noopener noreferrer"
            className="
              block py-3 px-6 text-center text-white font-medium 
              transition-all duration-300 ease-in-out
              hover:text-shadow hover:font-semibold
            "
          >
            Made by Do Jin, a founder of Pipe Solar
          </Link>
        </div>
        <div className="mt-4 text-center text-sm text-gray-600">
          © {currentYear} Pipe Solar. All rights reserved. 
          <br />
          This tool is for informational purposes only. 
          Unauthorized use or reproduction is prohibited.
        </div>
      </div>
    </footer>
  );
}
