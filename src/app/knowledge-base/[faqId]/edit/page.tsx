import { FaqEditor } from "@/components/faqs/faq-editor";
export default async function Page({ params }: { params: Promise<{ faqId: string }> }) { const { faqId } = await params; return <FaqEditor faqId={faqId} />; }
