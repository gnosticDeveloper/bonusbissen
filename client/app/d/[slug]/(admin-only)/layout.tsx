import { Fragment } from "react/jsx-runtime";

export default function AdminOnlyLayout({ children }: { children: React.ReactNode }) {
  return <Fragment>{children}</Fragment>;
}
