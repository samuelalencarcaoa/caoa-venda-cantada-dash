import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const Container = forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div">
>(function Container({ className, children, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "mx-auto w-full max-w-8xl px-4 sm:px-6 tablet:px-8 desktop:px-12",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});

export default Container;
