import Link from "next/link";
import {
  LayoutDashboard,
  ArrowDownToLine,
  ArrowUpFromLine,
  Package,
  Building2,
  Boxes,
  FileSpreadsheet,
  Archive,
  Settings,
  HelpCircle,
  Info,
  AlertTriangle,
} from "lucide-react";

/**
 * Help Desk / user guide page — content is in Roman Urdu because the
 * operators are Urdu-speaking. Structure: quick intro → step-by-step for
 * each screen → common problems → contact.
 */
export default function HelpPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
            <HelpCircle className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 sm:text-xl">
              Help Desk — Store Management System
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Ye page aap ko batata hai ke <b>Store Management System</b> kaise
              use karna hai — kahan se kya kaam hoga, kis screen pe kya add
              karna hai, aur report kaise nikalni hai. Sab kuch simple Roman
              Urdu me.
            </p>
          </div>
        </div>
      </div>

      {/* Quick intro */}
      <Section
        icon={<Info className="h-5 w-5" />}
        title="Ye system kya karta hai?"
      >
        <p>
          Ye ek <b>store / inventory management</b> system hai. Isme aap:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            Har din store me <b>jo saman aata hai (incoming / purchase)</b> uski
            entry rakh sakte ho — quantity, rate, total price, receipt sab.
          </li>
          <li>
            Store se <b>jo saman department ko diya jaata hai (outgoing)</b> uski
            entry rakh sakte ho — kis department ko, kitna, kis din.
          </li>
          <li>
            Har product ka <b>live stock</b> dekh sakte ho (kitna bacha hai).
          </li>
          <li>
            Har mahine ki <b>Excel report</b> download kar sakte ho — Store
            summary, per-day matrix, department-wise expense sab included.
          </li>
        </ul>
        <p className="mt-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">
          <b>Zaroori baat:</b> Ye system <b>FIFO (First In First Out)</b> use karta hai — matlab jo cheez pehle purchase hui thi wo pehle issue hogi, taake purani stock pehle nikle aur cost accurate ho.
        </p>
      </Section>

      {/* Dashboard */}
      <Section
        icon={<LayoutDashboard className="h-5 w-5" />}
        title="Dashboard — Kaha se start karna?"
      >
        <p>
          Login ke baad sab se pehle <b>Dashboard</b> khulta hai. Yahan aap ko
          milega:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Total products, total incoming qty, total outgoing qty.</li>
          <li>Current stock ki total value.</li>
          <li>
            Is mahine kitni entries hui, kitna kharcha hua (both purchases and
            consumption).
          </li>
          <li>
            <b>Quick Actions</b> — ek click me Add Incoming, Add Outgoing,
            Reports, Stock wagera.
          </li>
        </ul>
      </Section>

      {/* Departments */}
      <Section
        icon={<Building2 className="h-5 w-5" />}
        title="Departments — Pehla kaam ye karo"
      >
        <p>
          Outgoing entry karne se pehle aap ke paas <b>at least ek department
          active</b> hona chahiye.
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            Left menu se <b>Departments</b> pe jao (mobile me — neeche hamburger
            menu se).
          </li>
          <li>Department ka naam likho — misal ke tor pe: Kitchen, Front Office, Housekeeping, Admin, Security.</li>
          <li>
            <b>Add Department</b> button dabao.
          </li>
          <li>Jo department temporarily use nahi karna, uska <b>Deactivate</b> kar sakte ho — data delete nahi hoga.</li>
        </ol>
        <div className="mt-2 flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Duplicate naam allowed nahi hai — agar "Kitchen" already hai to dobara add nahi hoga.
          </span>
        </div>
      </Section>

      {/* Products */}
      <Section
        icon={<Package className="h-5 w-5" />}
        title="Products — Naya product kaise add hota hai?"
      >
        <p>
          Aap ko <b>alag se product manually add nahi karna</b> — jab bhi aap
          Incoming entry me naya product likhoge, wo automatically add ho jaega.
        </p>
        <p className="mt-2">
          Products page pe aap sirf existing products ki list dekh sakte ho,
          unit change kar sakte ho, ya kisi ko deactivate kar sakte ho (agar wo
          product ab use me nahi hai).
        </p>
      </Section>

      {/* Incoming */}
      <Section
        icon={<ArrowDownToLine className="h-5 w-5" />}
        title="Incoming — Purchase / Store me saman aana"
      >
        <p>Jab bhi bazaar se ya supplier se saman aae — foran entry karo:</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Menu se <b>Incoming</b> → phir <b>Add Incoming</b> button.</li>
          <li>
            <b>Product Name</b> likho (naya ho ya purana — dono chalte hain).
          </li>
          <li>
            <b>Unit</b> likho (KG, LTR, PCS, ML, PKT wagera).
          </li>
          <li>
            <b>Quantity</b> aur <b>Total Price</b> daalo. Per-unit price
            automatically calculate ho jaega, lekin aap manually bhi adjust kar
            sakte ho.
          </li>
          <li>Date aur Time daalo (default aaj ki date/time).</li>
          <li>
            <b>Receipt</b> (bill ki photo ya PDF) upload karo — future me proof
            ke liye rahegi.
          </li>
          <li>Save Entry dabao.</li>
        </ol>
        <div className="mt-2 flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <b>Void</b> sirf tab possible hai jab is batch se koi outgoing na
            hui ho. Agar issue ho chuki hai to pehle outgoing entries void
            karo, phir incoming void hoga.
          </span>
        </div>
      </Section>

      {/* Outgoing */}
      <Section
        icon={<ArrowUpFromLine className="h-5 w-5" />}
        title="Outgoing — Department ko saman dena"
      >
        <p>Jab kisi department ko store se saman diya jaae:</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Menu se <b>Outgoing</b> → <b>Add Outgoing</b> button.</li>
          <li>
            <b>Product</b> select karo (dropdown me sab available products).
          </li>
          <li>
            <b>Department</b> select karo (jis ko diya ja raha hai).
          </li>
          <li>
            <b>Quantity</b> daalo. Screen aap ko batayegi ke abhi kitna stock
            available hai.
          </li>
          <li>Date aur Time daalo.</li>
          <li>Notes (optional) — koi extra baat likhni ho to.</li>
          <li>Save Outgoing Entry dabao.</li>
        </ol>
        <p className="mt-2">
          System automatically <b>cost calculate karega</b> (FIFO ke hisaab se —
          sab se purani price pehle use hogi).
        </p>
        <div className="mt-2 flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <b>Insufficient stock</b> aa jaaye to ya to quantity kam karo, ya
            phir <b>"Allow override"</b> tick karo. Override use karne se stock
            negative ho jaayega (yaani "future stock ke against issue" ho gaya)
            — sirf emergency me use karo.
          </span>
        </div>
        <p className="mt-2">
          Ghalti se entry ho gayi ho? — us row pe <b>Void</b> dabao aur reason
          likho. Void karne se stock wapas add ho jaayega original price pe.
        </p>
      </Section>

      {/* Stock */}
      <Section
        icon={<Boxes className="h-5 w-5" />}
        title="Stock — Live inventory dekho"
      >
        <p>
          Stock page pe aap ko real-time stock milega — har product ki current
          quantity, stock value, aur average cost per unit.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700">In stock</span> = normal.
          </li>
          <li>
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700">Out of stock</span> = quantity 0 hai, purchase ki zaroorat hai.
          </li>
          <li>
            <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700">Over-issued</span> = negative stock — matlab jitna tha usse zyada issue ho gaya (override use hua). Foran ek naya incoming batch add karo.
          </li>
        </ul>
      </Section>

      {/* Reports */}
      <Section
        icon={<FileSpreadsheet className="h-5 w-5" />}
        title="Reports — Excel file kaise nikalni hai?"
      >
        <p>Reports page pe do options hain:</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            <b>Monthly Report</b> — month aur year select karo, phir
            <b> Generate XLSX</b>. Poore mahine ki Excel file download hogi.
          </li>
          <li>
            <b>Custom Date Range Report</b> — koi bhi start-to-end date de kar
            report banao (ek din se le kar poore saal tak).
          </li>
        </ol>
        <p className="mt-3 font-semibold">Excel file me ye sab sheets hongi:</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>
            <b>Store In & Out</b> — har product ki opening, incoming, outgoing,
            closing quantity aur money — plus <b>grand total</b>.
          </li>
          <li>
            <b>Outward (Day Matrix)</b> — jo aap ka purana August wala format
            tha wesa hi — har product row, har din column, kitna nikla us din.
            Plus expense column bhi.
          </li>
          <li>
            <b>Inward (Day Matrix)</b> — same shape lekin purchases ka.
          </li>
          <li>
            <b>Departments Summary</b> — kis department ne kitna liya, kitna
            expense hua, % share sab.
          </li>
          <li>
            <b>Dept: [naam]</b> — har department ki apni alag sheet, uska
            complete detail (date, product, qty, expense, per-product
            breakdown).
          </li>
        </ul>
      </Section>

      {/* Archives */}
      <Section
        icon={<Archive className="h-5 w-5" />}
        title="Archives — Purana saal band karna"
      >
        <p>
          Jab poora saal khatam ho jaaye (misal January 1 aaya) to aap purana
          saal <b>archive</b> kar sakte ho.
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Archives page pe jao.</li>
          <li>Saal ka number likho (misal 2025).</li>
          <li>
            <b>Archive Year</b> dabao — system pehle Excel file banaega, phir
            us saal ki fully-consumed entries alag archive tables me chali
            jayengi (live tables clean rehengi).
          </li>
        </ol>
        <div className="mt-2 flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Sirf woh saal archive ho sakta hai jo <b>poori tarha khatam</b> ho
            chuka ho — current year ya future year archive nahi hoga.
          </span>
        </div>
      </Section>

      {/* Settings */}
      <Section
        icon={<Settings className="h-5 w-5" />}
        title="Settings — Password change"
      >
        <p>
          Settings pe ja kar aap apna <b>password change</b> kar sakte ho. Bas
          purana password aur naya password daalo aur save karo.
        </p>
      </Section>

      {/* Common problems */}
      <Section
        icon={<AlertTriangle className="h-5 w-5" />}
        title="Common problems aur unke hal"
      >
        <ul className="space-y-3">
          <li>
            <p className="font-semibold text-gray-900">
              "Insufficient stock" error aa raha hai
            </p>
            <p className="text-sm text-gray-600">
              → Pehle new incoming batch add karo, ya phir override use karo
              (emergency only).
            </p>
          </li>
          <li>
            <p className="font-semibold text-gray-900">
              Product dropdown me naya product nahi dikh raha
            </p>
            <p className="text-sm text-gray-600">
              → Pehle Incoming me us product ki ek entry karo (naya product
              wahin add ho jaayega), phir Outgoing me select ho sakega.
            </p>
          </li>
          <li>
            <p className="font-semibold text-gray-900">
              Ghalat entry ho gayi
            </p>
            <p className="text-sm text-gray-600">
              → Incoming ho to <b>Edit</b> (agar issue nahi hui) ya{" "}
              <b>Void</b>. Outgoing ho to <b>Void</b> — stock wapas add ho
              jaayega.
            </p>
          </li>
          <li>
            <p className="font-semibold text-gray-900">
              Report download nahi ho rahi
            </p>
            <p className="text-sm text-gray-600">
              → Date range check karo (start &lt; end honi chahiye), phir dobara
              try karo. Agar phir bhi na ho, browser refresh karo.
            </p>
          </li>
          <li>
            <p className="font-semibold text-gray-900">
              Mobile pe table poori nahi dikh rahi
            </p>
            <p className="text-sm text-gray-600">
              → Mobile view me table cards ki shape me hoti hai (easier
              reading). Agar aap ne desktop view force ki hai to table left-right
              scroll ho sakti hai — bas ungli se swipe karo.
            </p>
          </li>
        </ul>
      </Section>

      {/* Contact / footer */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 text-center shadow-sm">
        <p className="text-sm text-gray-600">
          Koi aur problem ya sawal ho to admin ko contact karo.
        </p>
        <div className="mt-3 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
          >
            Back to Dashboard
          </Link>
          <Link
            href="/reports"
            className="inline-flex h-10 items-center justify-center rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Go to Reports
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-3 flex items-center gap-2 border-b border-gray-100 pb-3">
        <div className="rounded-md bg-gray-100 p-1.5 text-gray-700">{icon}</div>
        <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
          {title}
        </h2>
      </div>
      <div className="space-y-2 text-sm leading-relaxed text-gray-700">
        {children}
      </div>
    </section>
  );
}
