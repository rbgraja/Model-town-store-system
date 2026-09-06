import Link from "next/link";
import {
  LayoutDashboard,
  ArrowDownToLine,
  ArrowUpFromLine,
  Package,
  Tag,
  Building2,
  Boxes,
  CalendarDays,
  FileSpreadsheet,
  Archive,
  Settings,
  HelpCircle,
  Info,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

/**
 * Help Desk / user guide page — content is in Roman Urdu because the
 * operators are Urdu-speaking. Structure: quick intro → what's new →
 * step-by-step for each screen → common problems → contact.
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

      {/* What's new */}
      <Section
        icon={<Sparkles className="h-5 w-5" />}
        title="Kya naya add hua? (latest update)"
      >
        <p>Is update me 3 badi cheezein add hui hain:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <b>Categories</b> — har product ka ab ek category hoga (Bread, Meat
            & Poultry, Vegetables, Fruits, Dairy, Spices, Cleaning &
            Dishwashing wagera). Har category ka apna <b>rang</b> hota hai jo
            Products, Stock aur Excel report me nazar aata hai — dekhne me
            jaldi samajh aata hai kaunsa product kis type ka hai.
          </li>
          <li>
            <b>Product Calendar</b> — kisi bhi product ka poore mahine ka
            heatmap dekh sakte ho: kis din kitna aya (green), kis din kitna
            nikla (red). Poori history ek nazar me.
          </li>
          <li>
            <b>Excel report ka layout</b> — sab products (chahe us mahine
            movement hui ho ya na hui ho) ab sheet me automatically show hote
            hain, category-wise coloured banners ke sath — bilkul aap ke
            paper wale ledger jaisa. Har product ka <b>IN STOCK / DEPLETED /
            OUT OF STOCK</b> status column bhi.
          </li>
        </ul>
      </Section>

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
            Har product ka <b>live stock</b> dekh sakte ho (kitna bacha hai),
            aur kis category ka hai.
          </li>
          <li>
            Har product ka <b>calendar heatmap</b> dekh sakte ho — mahine me
            kis din kya movement hui.
          </li>
          <li>
            Har mahine ki <b>Excel report</b> download kar sakte ho — Store
            summary (category-wise coloured), per-day matrix, department-wise
            expense sab included.
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

      {/* Categories — NEW */}
      <Section
        icon={<Tag className="h-5 w-5" />}
        title="Categories — Products ko group karna (naya feature)"
      >
        <p>
          <b>Category</b> matlab product ki kism — jaise Bread, Meat & Poultry,
          Vegetables, Fruits, Dairy, Spices, Sauces, Cleaning wagera. System me
          <b> 16 default categories</b> pehle se bani hui hain — aap chahein to
          apni bhi banao ya rang change karo.
        </p>
        <p className="mt-2 font-semibold">Category kaise banao / edit karo:</p>
        <ol className="mt-1 list-decimal space-y-1 pl-5">
          <li>Left menu se <b>Categories</b> pe jao.</li>
          <li>
            <b>Category Name</b> likho (misal: "Frozen Desserts",
            "Beverages" wagera).
          </li>
          <li>
            <b>Color</b> pick karo — neeche palette me se click karo, ya khud
            koi 6-digit hex code likho (<code>FDE68A</code>, <code>BBF7D0</code>{" "}
            wagera). Ye rang Excel report aur Products page me use hoga.
          </li>
          <li>
            <b>Sort</b> — chota number pehle aata hai. Misal Bread ka sort 10
            aur Cleaning ka 900, to Bread upar rahegi list me.
          </li>
          <li><b>Add Category</b> dabao.</li>
        </ol>
        <p className="mt-2">
          Purana category rename karna ho, ya rang change karna ho — table me{" "}
          <b>Edit</b> dabao aur save karo. Deactivate karne se history safe
          rehti hai, sirf naye products me wo category select nahi ho sakti.
        </p>
        <div className="mt-2 flex items-start gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Reference file (Kitchen Consumption Report) ke <b>286 products</b> ab
            pre-loaded hain, sab category-wise. Aap unhe direct <b>Products</b> page
            se dekh sakte ho.
          </span>
        </div>
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

      {/* Products — UPDATED for category */}
      <Section
        icon={<Package className="h-5 w-5" />}
        title="Products — Add karo aur category assign karo"
      >
        <p>
          Product do tarike se add ho sakta hai:
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            <b>Manually — Products page se:</b> naam, unit, aur <b>category</b>{" "}
            select karo, phir <b>Add Product</b>. Category dropdown se koi bhi
            active category chun sakte ho (ya "Uncategorized" chhod do).
          </li>
          <li>
            <b>Automatically — Incoming entry se:</b> jab aap Incoming me naya
            product naam likhoge, wo system me apne aap create ho jayega. Baad
            me Products page se uska category set kar dena.
          </li>
        </ol>
        <p className="mt-2">
          Products page pe rows ab <b>category-wise grouped</b> aati hain, har
          category ka coloured banner upar. Search box ke saath ek{" "}
          <b>category filter</b> bhi hai — sirf ek category ke products dekhne
          ke liye use karo.
        </p>
        <p className="mt-2">
          Jo product ka current stock 0 ho, uske aage ek chota{" "}
          <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700">
            out of stock
          </span>{" "}
          badge nazar aata hai — jaldi samajh aata hai kya khareedna hai.
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
        <div className="mt-2 flex items-start gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Naya product Incoming se add hua ho to uska <b>category</b>{" "}
            initially blank hoga. Baad me Products page pe ja kar edit karo aur
            correct category assign karo — warna wo product Excel report me
            "Uncategorized" section me chala jaayega.
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
          quantity, stock value, aur average cost per unit. Rows ab{" "}
          <b>category-wise grouped</b> aati hain (jaisa Products page me hota
          hai), plus ek <b>category filter</b> bhi hai upar.
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

      {/* Product Calendar — NEW */}
      <Section
        icon={<CalendarDays className="h-5 w-5" />}
        title="Product Calendar — Kisi product ka poora mahina dekho (naya feature)"
      >
        <p>
          Kabhi kabhi ye jaanna hota hai ke ek product kis kis din aaya aur kis
          kis din nikla — <b>Product Calendar</b> page bilkul isi ke liye hai.
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Left menu se <b>Product Calendar</b> pe jao.</li>
          <li>
            Chahein to pehle <b>category filter</b> laga do (misal sirf
            "Meat & Poultry" wale products dropdown me aa jayenge).
          </li>
          <li>
            <b>Product</b> dropdown se koi ek product choose karo.
          </li>
          <li>
            Upar ke <b>‹ / ›</b> buttons se month change karo, ya{" "}
            <b>Today</b> dabao aaj ke mahine par jump karne ke liye.
          </li>
        </ol>
        <p className="mt-2">Calendar ki reading kaise karo:</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>
            <b>Green stripe (upar)</b> = us din stock <b>aya (incoming)</b> —
            jitna gehra rang, utni zyada quantity.
          </li>
          <li>
            <b>Red stripe (neeche)</b> = us din stock <b>nikla (outgoing)</b> —
            department ko diya gaya.
          </li>
          <li>
            Kisi bhi cell pe <b>hover</b> karo — tooltip me exact date, qty,
            aur expense show hoga.
          </li>
          <li>
            Blank cell = us din is product ki koi movement nahi hui.
          </li>
        </ul>
        <p className="mt-2">
          Upar KPI strip me month totals hain (kitna aya, kitna gaya, net
          movement, current stock). Neeche <b>Day-by-day</b> table me sirf woh
          din listed hain jab koi movement hui — clean list ke liye.
        </p>
      </Section>

      {/* Reports — UPDATED */}
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
            closing quantity aur money — plus <b>grand total</b>. Products ab{" "}
            <b>category-wise banded</b> aate hain (Bread, Meat, Vegetables
            wagera ka apna rangeen banner row), aur last column me{" "}
            <b>IN STOCK / DEPLETED / OUT OF STOCK</b> status.
          </li>
          <li>
            <b>Outward (Day Matrix)</b> — jo aap ka purana August wala format
            tha wesa hi — har product row, har din column, kitna nikla us din.
            Ab category column bhi add ho gaya hai, aur banner rows bhi.
          </li>
          <li>
            <b>Inward (Day Matrix)</b> — same shape lekin purchases ka.
          </li>
          <li>
            <b>Departments Summary</b> — kis department ne kitna liya, kitna
            expense hua, % share sab.
          </li>
          <li>
            <b>Dept: [naam]</b> — har department ki apni alag sheet — complete
            detail (date, product, qty, expense). Per-product breakdown ab bhi
            <b> category-wise coloured</b> hoti hai.
          </li>
          <li>
            <b>Summary</b> — poori report ka snapshot, plus{" "}
            <b>Category-wise Expense Summary</b> table (kis category pe kitna
            purchase, kitna consumption).
          </li>
        </ul>
        <div className="mt-2 flex items-start gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Sab active products har report me automatically aate hain — chahe
            us mahine unki koi movement na hui ho. Quantity blank rehti hai aur
            Status "OUT OF STOCK" show hota hai. Ye aap ke paper wale ledger
            jaisa hai — har mahine ek complete roster.
          </span>
        </div>
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
              wahin add ho jaayega), phir Outgoing me select ho sakega. Ya
              direct <b>Products</b> page se manually add kar do.
            </p>
          </li>
          <li>
            <p className="font-semibold text-gray-900">
              Excel report me kuch products "Uncategorized" me aa rahe hain
            </p>
            <p className="text-sm text-gray-600">
              → Un products ka category set nahi hua. <b>Products</b> page pe
              jao, filter "— Uncategorized —" laga do, phir har product ka Edit
              dabao aur correct category select kar ke save karo.
            </p>
          </li>
          <li>
            <p className="font-semibold text-gray-900">
              Category ka rang change karna hai
            </p>
            <p className="text-sm text-gray-600">
              → <b>Categories</b> page pe jao, us category ka <b>Edit</b>{" "}
              dabao, palette me se naya rang pick karo (ya 6-digit hex code
              likho), phir Save. Products / Stock / Excel report sab me foran
              naya rang lag jaayega.
            </p>
          </li>
          <li>
            <p className="font-semibold text-gray-900">
              Product Calendar me kuch nahi dikh raha
            </p>
            <p className="text-sm text-gray-600">
              → Iska matlab us product ki us mahine me koi movement nahi hui.
              Month change karo (‹ / ›), ya doosra product try karo. Agar poora
              mahine blank hai to page ke neeche "No movement" message ayega.
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
