import { permanentRedirect } from "next/navigation";

export default function DeprecatedCategoryPage() {
  permanentRedirect("/explore");
}
