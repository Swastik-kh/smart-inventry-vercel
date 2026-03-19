import React, { useState, useEffect } from 'react';
import { Baby, Activity, AlertTriangle, CheckCircle2, Info, Stethoscope } from 'lucide-react';

type Classification = {
  title: string;
  titleNepali: string;
  color: string;
  description: string;
  descriptionNepali: string;
};

const App: React.FC = () => {
  const [age, setAge] = useState<number | ''>('');
  const [respiratoryRate, setRespiratoryRate] = useState<number | ''>('');
  const [classification, setClassification] = useState<Classification | null>(null);

  useEffect(() => {
    if (age === '' || respiratoryRate === '') {
      setClassification(null);
      return;
    }

    const ageNum = Number(age);
    const rrNum = Number(respiratoryRate);

    if (ageNum >= 0 && ageNum <= 7) {
      if (rrNum >= 60) {
        setClassification({
          title: "Possible Serious Bacterial Infection or Very Severe Disease",
          titleNepali: "ब्याक्टेरियाको सम्भावित गम्भीर संक्रमण वा धेरै कडा रोग",
          color: "bg-red-100 border-red-500 text-red-900",
          description: "Urgent referral to hospital is required.",
          descriptionNepali: "तुरुन्तै अस्पताल प्रेषण (Refer) गर्नुपर्छ।"
        });
      } else {
        setClassification({
          title: "No Pneumonia / No Serious Infection",
          titleNepali: "निमोनिया छैन / गम्भीर संक्रमण छैन",
          color: "bg-green-100 border-green-500 text-green-900",
          description: "Follow home care instructions.",
          descriptionNepali: "घरमा हेरचाह गर्ने सल्लाह दिनुहोस्।"
        });
      }
    } else if (ageNum > 7 && ageNum <= 59) {
      if (rrNum >= 60) {
        setClassification({
          title: "Pneumonia",
          titleNepali: "निमोनिया",
          color: "bg-yellow-100 border-yellow-500 text-yellow-900",
          description: "Treat with appropriate antibiotics and follow up.",
          descriptionNepali: "उपयुक्त एन्टिबायोटिकले उपचार गर्नुहोस् र फलो-अप गर्नुहोस्।"
        });
      } else {
        setClassification({
          title: "No Pneumonia",
          titleNepali: "निमोनिया छैन",
          color: "bg-green-100 border-green-500 text-green-900",
          description: "Follow home care instructions.",
          descriptionNepali: "घरमा हेरचाह गर्ने सल्लाह दिनुहोस्।"
        });
      }
    } else {
      setClassification(null);
    }
  }, [age, respiratoryRate]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 md:p-8 font-sans">
      <header className="w-full max-w-2xl mb-8 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-200">
          <Stethoscope className="text-white w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
          IMCI Nepal Infant Classifier
        </h1>
        <p className="text-slate-500 font-medium">
          नवजात शिशु र सानो बच्चाको रोग वर्गीकरण (IMCI)
        </p>
      </header>

      <main className="w-full max-w-2xl bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
        <div className="p-6 md:p-8 space-y-8">
          {/* Age Input */}
          <div className="space-y-3">
            <label className="flex items-center text-sm font-semibold text-slate-700 uppercase tracking-wider">
              <Baby className="w-4 h-4 mr-2 text-blue-500" />
              Age of Infant (Days) / शिशुको उमेर (दिन)
            </label>
            <div className="relative">
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value === '' ? '' : parseInt(e.target.value))}
                placeholder="Enter age in days (0-59)"
                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-lg font-medium"
                min="0"
                max="59"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                Days
              </div>
            </div>
            <p className="text-xs text-slate-400 italic">
              * Valid for infants aged 0 to 59 days.
            </p>
          </div>

          {/* Respiratory Rate Input */}
          <div className="space-y-3">
            <label className="flex items-center text-sm font-semibold text-slate-700 uppercase tracking-wider">
              <Activity className="w-4 h-4 mr-2 text-red-500" />
              Respiratory Rate (Breaths/min) / सास फेर्ने दर (प्रति मिनेट)
            </label>
            <div className="relative">
              <input
                type="number"
                value={respiratoryRate}
                onChange={(e) => setRespiratoryRate(e.target.value === '' ? '' : parseInt(e.target.value))}
                placeholder="Enter breaths per minute"
                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-lg font-medium"
                min="0"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                BPM
              </div>
            </div>
          </div>

          {/* Result Section */}
          <div className="pt-4">
            {classification ? (
              <div className={`p-6 rounded-2xl border-2 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 ${classification.color}`}>
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {classification.title.includes("Serious") ? (
                      <AlertTriangle className="w-8 h-8" />
                    ) : classification.title.includes("Pneumonia") && !classification.title.includes("No") ? (
                      <AlertTriangle className="w-8 h-8" />
                    ) : (
                      <CheckCircle2 className="w-8 h-8" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold leading-tight">
                      {classification.titleNepali}
                    </h2>
                    <h3 className="text-sm font-semibold opacity-80 uppercase tracking-wide">
                      {classification.title}
                    </h3>
                    <div className="h-px bg-current opacity-20 my-3" />
                    <p className="font-medium">
                      {classification.descriptionNepali}
                    </p>
                    <p className="text-sm opacity-80 italic">
                      {classification.description}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 space-y-2">
                <Info className="w-8 h-8 opacity-50" />
                <p className="font-medium">Enter age and respiratory rate to see classification</p>
                <p className="text-sm">वर्गीकरण हेर्नको लागि उमेर र सास फेर्ने दर राख्नुहोस्</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="bg-slate-50 p-6 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Guidelines / निर्देशिका</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-500 leading-relaxed">
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-700 block mb-1">0 - 7 Days:</span>
              RR ≥ 60 → Possible Serious Bacterial Infection<br/>
              RR ≥ ६० → ब्याक्टेरियाको सम्भावित गम्भीर संक्रमण
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-700 block mb-1">7 - 59 Days:</span>
              RR ≥ 60 → Pneumonia<br/>
              RR ≥ ६० → निमोनिया
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-8 text-slate-400 text-xs text-center">
        <p>© 2026 IMCI Nepal Guidelines • For Professional Use Only</p>
      </footer>
    </div>
  );
};

export default App;
