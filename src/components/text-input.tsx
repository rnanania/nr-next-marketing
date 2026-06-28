"use client";
// React 19: `ref` is just a regular prop — no `forwardRef` needed.
//
// Before 19 you'd write `forwardRef((props, ref) => …)`. Now a function component
// can simply accept `ref` in its props and pass it through. Cleaner types, less
// boilerplate. (React.ComponentProps<"input"> already includes the right `ref`
// type for the underlying DOM node.)

export default function TextInput(props: React.ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={
        "rounded border border-black/45 px-3 py-2 text-sm dark:border-white/35 dark:bg-transparent " +
        (props.className ?? "")
      }
    />
  );
}
