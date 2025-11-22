import Image from "next/image";

export const LancerLogo = ({ className }: { className?: string }) => {
  return (
    <Image
      src="../public/LancerLogo.png"
      alt="My Logo"
      width={50}
      height={60} 
      className={className}
    />
  );
};
