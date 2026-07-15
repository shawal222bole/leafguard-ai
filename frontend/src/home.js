import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

// ---------------------------------------------------------------------------
// Disease knowledge base — shown to the farmer once a prediction comes back.
// Keys are normalized (lowercase, no punctuation) so predictions like
// "Potato___Early_blight" or "Early Blight" both match.
// ---------------------------------------------------------------------------
const DISEASE_INFO = {
  earlyblight: {
    label: "Early Blight",
    tag: "Fungal disease",
    color: "#F5A623",
    cause:
      "Caused by the fungus Alternaria solani. It usually appears first on older, lower leaves as small brown spots with concentric rings, like a target.",
    prevention: [
      "Rotate crops — avoid planting potatoes or tomatoes in the same soil for 2-3 years.",
      "Space plants well apart so air can move freely and leaves dry quickly.",
      "Water at the base of the plant in the morning; avoid wetting the leaves.",
      "Remove and destroy infected leaves and plant debris at the end of the season.",
    ],
    treatment: [
      "Apply a fungicide containing chlorothalonil, mancozeb, or copper as soon as symptoms appear.",
      "Repeat fungicide application on a regular schedule during humid or rainy periods, following the product label.",
      "Remove heavily infected leaves to slow the spread to healthy foliage.",
      "Keep the field weed-free, since weeds can host the fungus between seasons.",
    ],
  },
  lateblight: {
    label: "Late Blight",
    tag: "Fungal-like disease — spreads fast",
    color: "#EF4444",
    cause:
      "Caused by the water mold Phytophthora infestans. Look for dark, water-soaked patches on leaves, often with a pale fuzzy mold underneath in humid weather. This is the disease behind the historic Irish potato famine and can destroy a field within days.",
    prevention: [
      "Plant certified, disease-free seed potatoes and resistant varieties where available.",
      "Improve field drainage — standing water and high humidity help this disease spread.",
      "Avoid overhead irrigation, especially in the evening.",
      "Monitor fields closely during cool, wet weather, when outbreaks are most likely.",
    ],
    treatment: [
      "Apply a protective fungicide (copper-based, chlorothalonil, or mancozeb) at the first sign of infection.",
      "Remove and destroy infected plants immediately — do not compost them.",
      "Avoid working in the field while leaves are wet, since this can spread spores.",
      "If an outbreak is severe, consider destroying above-ground foliage early to protect the tubers.",
    ],
  },
  healthy: {
    label: "Healthy",
    tag: "No disease detected",
    color: "#4ADE80",
    cause:
      "This leaf shows no visible signs of early blight or late blight. Regular monitoring is still the best way to catch problems early.",
    prevention: [
      "Keep up a regular watering schedule — consistent moisture, not waterlogged soil.",
      "Feed the soil with a balanced fertilizer (nitrogen, phosphorus, potassium) suited to potatoes.",
      "Keep scanning leaves weekly, especially after rain, to catch early signs of disease before they spread.",
      "Continue crop rotation and good field spacing even when plants look healthy — prevention is cheaper than treatment.",
    ],
    treatment: [
      "No treatment needed right now. Maintain current care practices.",
      "Re-scan every 5-7 days during the growing season to keep monitoring plant health.",
    ],
  },
};

const normalize = (label) =>
  (label || "").toLowerCase().replace(/[^a-z]/g, "");

const getDiseaseInfo = (rawLabel) => {
  const key = normalize(rawLabel);
  if (key.includes("early")) return DISEASE_INFO.earlyblight;
  if (key.includes("late")) return DISEASE_INFO.lateblight;
  if (key.includes("healthy")) return DISEASE_INFO.healthy;
  return null;
};

function AutoDemo() {
  // Cycles through 4 stages on a timer to simulate the scan flow.
  // 0 = idle dropzone, 1 = image dropped in, 2 = scanning, 3 = result shown
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const durations = [1400, 900, 1800, 2600];
    const timer = setTimeout(() => {
      setStage((prev) => (prev + 1) % 4);
    }, durations[stage]);
    return () => clearTimeout(timer);
  }, [stage]);

  return (
    <div style={s.demoCard}>
      <div style={s.demoWindowBar}>
        <span style={s.demoDot} />
        <span style={s.demoDot} />
        <span style={s.demoDot} />
        <span style={s.demoUrl}>localhost:3000</span>
      </div>
      <div style={s.demoBody}>
        {stage === 0 && (
          <div style={s.demoDropzone}>
            <div style={s.dropzoneRing}>
              <div style={s.uploadIconBadge}><span style={s.uploadIconGlyph}>⤴</span></div>
            </div>
            <p style={s.dropText}>Drop a leaf photo here</p>
            <p style={s.dropSubtextStrong}>or click to browse your files</p>
          </div>
        )}

        {stage >= 1 && (
          <div style={s.demoPreviewWrap}>
            <img
              src="https://images.unsplash.com/photo-1720601015994-b0d68e0c5982?auto=format&fit=crop&w=500&q=70"
              alt="Leaf being scanned"
              style={s.demoPreviewImg}
            />
            {stage === 2 && <div style={s.scanLine} />}
          </div>
        )}

        {stage === 2 && (
          <div style={s.loadingWrap}>
            <div style={s.spinner} />
            <p style={s.loadingText}>Analyzing leaf pattern...</p>
          </div>
        )}

        {stage === 3 && (
          <div style={s.resultBox}>
            <p style={s.resultLabel}>Diagnosis</p>
            <h2 style={{ ...s.resultValue, color: "#F5A623" }}>Early Blight</h2>
            <p style={s.resultTag}>Fungal disease</p>
            <div style={s.confidenceBarBg}>
              <div style={{ ...s.confidenceBarFill, width: "91%", background: "#F5A623" }} />
            </div>
            <p style={s.confidenceText}>Confidence: 91.0%</p>
          </div>
        )}
      </div>
      <div style={s.demoDots}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} style={{ ...s.demoDotIndicator, ...(stage === i ? s.demoDotIndicatorActive : {}) }} />
        ))}
      </div>
    </div>
  );
}

function ImageUpload() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const resultRef = useRef(null);

  const sendFile = async (selectedFile) => {
    const formData = new FormData();
    formData.append("file", selectedFile);
    try {
      setError(null);
      const res = await axios.post(
        "https://leafguard-ai-34bj.onrender.com/predict",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setData(res.data);
    } catch (err) {
      if (err.response) {
        setError(
          `Server error (${err.response.status}): ${JSON.stringify(err.response.data)}`
        );
      } else if (err.request) {
        setError("No response from the server. Make sure the backend is running.");
      } else {
        setError(`Unexpected error: ${err.message}`);
      }
    }
  };

  useEffect(() => {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    const upload = async () => {
      setLoading(true);
      setData(null);
      await sendFile(file);
      setLoading(false);
    };
    upload();
    return () => URL.revokeObjectURL(file);
  }, [file]);

  useEffect(() => {
    if (data && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [data]);

  const handleFileSelect = (selected) => {
    if (selected && selected.type.startsWith("image/")) {
      setFile(selected);
      setData(null);
      setError(null);
    } else {
      setError("Please upload a valid image file (JPG or PNG).");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files[0]);
  };

  const resetUpload = () => {
    setFile(null);
    setPreview(null);
    setData(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const predictedLabel = data ? data.class || data.prediction : null;
  const info = getDiseaseInfo(predictedLabel);
  const confidencePct = data ? ((data.confidence || 0) * 100).toFixed(1) : null;

  const scrollToUpload = () => {
    document.getElementById("scan-section")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={s.page}>
      {/* ---------------- NAV ---------------- */}
      <nav style={s.nav}>
        <div style={s.navInner}>
          <div style={s.brand}>
            <img src="/favicon.svg" alt="LeafGuard AI logo" style={{ width: 38, height: 38 }} />
            <span style={s.brandName}>LeafGuard AI</span>
          </div>
          <div style={s.navLinks}>
            <a href="#scan-section" style={s.navLink}>Scan a Leaf</a>
            <a href="#how-it-works" style={s.navLink}>How It Works</a>
            <a href="#mission" style={s.navLink}>Our Mission</a>
            <a href="#contact" style={s.navLink}>Contact</a>
          </div>
        </div>
      </nav>

      {/* ---------------- HERO ---------------- */}
      <header style={s.hero}>
        <div style={s.heroInner}>
          <div style={s.heroLeft}>
            <span style={s.eyebrow}>AI-POWERED CROP DIAGNOSTICS</span>
            <h1 style={s.heroTitle}>
              Know what's on your potato leaves — before it spreads.
            </h1>
            <p style={s.heroText}>
              LeafGuard AI uses a trained machine learning model to instantly
              identify Early Blight, Late Blight, or a Healthy potato leaf
              from a single photo — giving farmers a fast, low-cost early
              warning system that used to require an expert in the field.
            </p>
            <div style={s.heroButtons}>
              <button style={s.primaryBtn} onClick={scrollToUpload}>
                Scan a Leaf Now
              </button>
              <a href="#mission" style={s.secondaryBtn}>
                Our Mission →
              </a>
            </div>
            <div style={s.heroStats}>
              <div style={s.statBlock}>
                <span style={s.statNumber}>3</span>
                <span style={s.statLabel}>Conditions detected</span>
              </div>
              <div style={s.statDivider} />
              <div style={s.statBlock}>
                <span style={s.statNumber}>&lt;2s</span>
                <span style={s.statLabel}>Average scan time</span>
              </div>
              <div style={s.statDivider} />
              <div style={s.statBlock}>
                <span style={s.statNumber}>Growing</span>
                <span style={s.statLabel}>Dataset, every season</span>
              </div>
            </div>
          </div>
          <div style={s.heroRight}>
            <div style={s.scanFrame}>
              <div style={s.scanFrameGlow} />
              <div style={s.scanFrameInner}>
                <img
                  src="https://images.unsplash.com/photo-1653301652666-2773fa78925c?auto=format&fit=crop&w=640&q=80"
                  alt="Close-up of a green plant leaf being inspected"
                  style={s.scanFrameImg}
                />
                <div style={s.scanFrameOverlay} />
                <span style={s.scanCorner1} />
                <span style={s.scanCorner2} />
                <span style={s.scanCorner3} />
                <span style={s.scanCorner4} />
                <p style={s.scanFrameText}>Live leaf diagnostics</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ---------------- SCAN / UPLOAD SECTION ---------------- */}
      <section id="scan-section" style={s.section}>
        <div style={s.sectionInner}>
          <span style={s.eyebrow}>DIAGNOSE A LEAF</span>
          <h2 style={s.sectionTitle}>Upload a photo to get started</h2>
          <p style={s.sectionSubtext}>
            Take a clear, well-lit photo of a single potato leaf. Our model
            will analyze it and tell you whether it's healthy or shows signs
            of Early or Late Blight — along with what to do next.
          </p>

          <div style={s.futureBanner}>
            <span style={s.futureBannerIcon}>🌱</span>
            <p style={s.futureBannerText}>
              <strong>Currently detecting potato leaf disease.</strong>{" "}
              We're actively training the model to detect diseases in more
              crops — tomato, pepper, and other staple plants are coming soon.
            </p>
          </div>

          <div style={s.helpBanner}>
            <img
              src="https://images.unsplash.com/photo-1641118593381-ded30a11d4e1?auto=format&fit=crop&w=1000&q=70"
              alt="A field of crops damaged by disease"
              style={s.helpBannerImg}
            />
            <div style={s.helpBannerOverlay} />
            <div style={s.helpBannerContent}>
              <p style={s.helpBannerText}>
                This is what unmanaged disease does to a field. LeafGuard AI
                exists so a farmer can catch this on a single leaf, weeks
                before it looks like this.
              </p>
            </div>
          </div>

          <div style={s.scanLayout}>
            <div style={s.scanCard}>
              <div style={s.scanCardHeader}>
                <div style={s.scanCardHeaderLeft}>
                  <span
                    style={{
                      ...s.statusDot,
                      background: loading ? "#F5A623" : data ? "#4ADE80" : "#2DD4BF",
                    }}
                  />
                  <span style={s.scanCardHeaderTitle}>AI Leaf Scanner</span>
                </div>
                <span style={s.scanCardHeaderStatus}>
                  {loading ? "Analyzing" : data ? "Complete" : "Ready"}
                </span>
              </div>

              <div style={s.scanCardBody}>
                {!preview && (
                  <div
                    style={{ ...s.dropzone, ...(dragActive ? s.dropzoneActive : {}) }}
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current.click()}
                  >
                    <div style={s.dropzoneRing}>
                      <div style={s.uploadIconBadge}>
                        <span style={s.uploadIconGlyph}>⤴</span>
                      </div>
                    </div>
                    <p style={s.dropText}>Drop a leaf photo here</p>
                    <p style={s.dropSubtextStrong}>or click to browse your files</p>
                    <div style={s.dropDivider} />
                    <p style={s.dropSubtext}>Supports JPG and PNG · up to 10MB</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => e.target.files.length > 0 && handleFileSelect(e.target.files[0])}
                    />
                  </div>
                )}

                {preview && (
                  <div style={s.previewWrap}>
                    <div style={s.previewImgWrap}>
                      <img src={preview} alt="Uploaded leaf" style={s.previewImg} />
                      <span style={s.scanCorner1} />
                      <span style={s.scanCorner2} />
                      <span style={s.scanCorner3} />
                      <span style={s.scanCorner4} />
                      {loading && <div style={s.scanLine} />}
                    </div>
                    <button style={s.newImageBtn} onClick={resetUpload}>
                      ⟳ Upload a different image
                    </button>
                  </div>
                )}

                {loading && (
                  <div style={s.loadingWrap}>
                    <div style={s.spinner} />
                    <p style={s.loadingText}>Analyzing leaf pattern...</p>
                  </div>
                )}

                {error && (
                  <div style={s.errorBox}><strong>⚠ Error:</strong> {error}</div>
                )}

                {!loading && !error && data && (
                  <div ref={resultRef} style={s.resultBox}>
                    <p style={s.resultLabel}>Diagnosis</p>
                    <h2 style={{ ...s.resultValue, color: info ? info.color : "#E7EEF5" }}>
                      {info ? info.label : predictedLabel || "No result"}
                    </h2>
                    {info && <p style={s.resultTag}>{info.tag}</p>}

                    <div style={s.confidenceBarBg}>
                      <div
                        style={{
                          ...s.confidenceBarFill,
                          width: `${confidencePct}%`,
                          background: info ? info.color : "#1D4ED8",
                        }}
                      />
                    </div>
                    <p style={s.confidenceText}>Confidence: {confidencePct}%</p>

                    {info && (
                      <div style={s.infoGrid}>
                        <div style={s.infoBlock}>
                          <h4 style={s.infoHeading}>What's happening</h4>
                          <p style={s.infoText}>{info.cause}</p>
                        </div>
                        <div style={s.infoBlock}>
                          <h4 style={s.infoHeading}>Prevention</h4>
                          <ul style={s.infoList}>
                            {info.prevention.map((item, i) => <li key={i}>{item}</li>)}
                          </ul>
                        </div>
                        <div style={s.infoBlock}>
                          <h4 style={s.infoHeading}>
                            {info.label === "Healthy" ? "Ongoing care" : "Treatment"}
                          </h4>
                          <ul style={s.infoList}>
                            {info.treatment.map((item, i) => <li key={i}>{item}</li>)}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <aside style={s.tipsCard}>
              <h3 style={s.tipsTitle}>For an accurate result</h3>
              <ul style={s.tipsList}>
                <li style={s.tipsItem}>
                  <span style={s.tipsCheck}>✓</span>
                  <span>Shoot in natural daylight, not direct flash</span>
                </li>
                <li style={s.tipsItem}>
                  <span style={s.tipsCheck}>✓</span>
                  <span>Fill the frame with a single leaf</span>
                </li>
                <li style={s.tipsItem}>
                  <span style={s.tipsCheck}>✓</span>
                  <span>Use a plain background where possible</span>
                </li>
                <li style={s.tipsItem}>
                  <span style={s.tipsCheck}>✓</span>
                  <span>Keep the leaf in focus, avoid blur</span>
                </li>
              </ul>
              <div style={s.tipsDivider} />
              <p style={s.tipsFootnote}>
                Results are a guide, not a substitute for an agronomist's
                diagnosis in borderline or high-value cases.
              </p>
            </aside>
          </div>
        </div>
      </section>

      {/* ---------------- HOW IT WORKS ---------------- */}
      <section id="how-it-works" style={s.sectionAlt}>
        <div style={s.sectionInner}>
          <span style={s.eyebrow}>THE PROCESS</span>
          <h2 style={s.sectionTitle}>From leaf to diagnosis in three steps</h2>
          <div style={s.stepsGrid}>
            <div style={s.stepCard}>
              <img
                src="https://images.unsplash.com/photo-1720601015994-b0d68e0c5982?auto=format&fit=crop&w=500&q=70"
                alt="Close-up of a green leaf"
                style={s.stepImg}
              />
              <span style={s.stepNumber}>01</span>
              <h3 style={s.stepTitle}>Capture</h3>
              <p style={s.stepText}>
                Take a clear photo of a single potato leaf in daylight, against a plain background if possible.
              </p>
            </div>
            <div style={s.stepCard}>
              <span style={s.stepNumber}>02</span>
              <h3 style={s.stepTitle}>Analyze</h3>
              <p style={s.stepText}>
                Our trained model examines leaf color, spotting, and texture patterns to classify the image.
              </p>
            </div>
            <div style={s.stepCard}>
              <span style={s.stepNumber}>03</span>
              <h3 style={s.stepTitle}>Act</h3>
              <p style={s.stepText}>
                Get an instant result with confidence score, plus specific prevention and treatment guidance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- ANIMATED DEMO ---------------- */}
      <section style={s.section}>
        <div style={s.sectionInner}>
          <span style={s.eyebrow}>SEE IT IN ACTION</span>
          <h2 style={s.sectionTitle}>What a scan looks like</h2>
          <p style={s.sectionSubtext}>
            A quick walkthrough of the scanning flow — upload a photo, watch
            it get analyzed, and get a diagnosis with next steps.
          </p>
          <AutoDemo />
        </div>
      </section>

      {/* ---------------- ML / MODEL EXPLANATION ---------------- */}
      <section style={s.section}>
        <div style={s.sectionInner}>
          <span style={s.eyebrow}>UNDER THE HOOD</span>
          <h2 style={s.sectionTitle}>Built on machine learning — and always improving</h2>
          <div style={s.mlGrid}>
            <div style={s.mlCard}>
              <h3 style={s.mlCardTitle}>Trained on real leaf images</h3>
              <p style={s.mlCardText}>
                The model behind LeafGuard AI was trained on thousands of labeled
                potato leaf images covering Early Blight, Late Blight, and
                healthy leaves, learning the visual patterns that distinguish
                each condition.
              </p>
            </div>
            <div style={s.mlCard}>
              <h3 style={s.mlCardTitle}>Continuously retrained</h3>
              <p style={s.mlCardText}>
                We're actively collecting more field data and retraining the
                model to improve its accuracy across different lighting
                conditions, leaf angles, and regional potato varieties.
              </p>
            </div>
            <div style={s.mlCard}>
              <h3 style={s.mlCardTitle}>Expanding beyond potatoes</h3>
              <p style={s.mlCardText}>
                Potato leaves are just the starting point. We're building
                toward support for more crops — tomatoes, peppers, and other
                staple plants — so more farmers can benefit from early
                disease detection.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- THE COST OF UNCHECKED DISEASE ---------------- */}
      <section style={s.sectionAlt}>
        <div style={s.sectionInner}>
          <span style={s.eyebrow}>WHY IT MATTERS</span>
          <div style={s.stakesGrid}>
            <div style={s.stakesText}>
              <h2 style={s.stakesTitle}>Left untreated, disease can take an entire field</h2>
              <p style={s.stakesSubtext}>
                This is what unchecked blight looks like at scale — a field
                of plants lost to disease that spread before anyone noticed.
                Early detection on a single leaf is what stands between this
                and a healthy harvest.
              </p>
              <div style={s.stakesStatRow}>
                <div style={s.stakesStat}>
                  <span style={s.stakesStatNumber}>Days</span>
                  <span style={s.stakesStatLabel}>Late blight can spread through a field</span>
                </div>
                <div style={s.stakesStat}>
                  <span style={s.stakesStatNumber}>Whole crop</span>
                  <span style={s.stakesStatLabel}>Potential loss without early action</span>
                </div>
              </div>
            </div>
            <div style={s.fieldFrame}>
              <img
                src="https://images.unsplash.com/photo-1641118593381-ded30a11d4e1?auto=format&fit=crop&w=900&q=70"
                alt="A large field of dead, disease-affected crop plants"
                style={s.fieldFrameImg}
              />
              <span style={s.scanCorner1} />
              <span style={s.scanCorner2} />
              <span style={s.scanCorner3} />
              <span style={s.scanCorner4} />
              <div style={s.fieldFrameTag}>Field lost to unmanaged disease</div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- MISSION / IMPACT ---------------- */}
      <section id="mission" style={s.missionSection}>
        <div style={s.sectionInner}>
          <div style={s.missionIntro}>
            <img src="/favicon.svg" alt="LeafGuard AI logo" style={s.missionLogo} />
            <span style={s.eyebrow}>OUR MISSION</span>
            <h2 style={{ ...s.sectionTitle, textAlign: "center" }}>
              Helping farmers protect their harvest, one leaf at a time
            </h2>
            <p style={{ ...s.sectionSubtext, textAlign: "center", margin: "0 auto 0 auto" }}>
              LeafGuard AI exists because crop disease doesn't wait. A single
              undetected leaf can turn into a lost field within days, and for
              many farmers that loss is the difference between a good season
              and a hard one. We believe every farmer — regardless of budget,
              location, or access to an agronomist — deserves a fast, reliable
              way to check on their plants. That's why LeafGuard AI is built
              to run from nothing more than a phone camera: no lab equipment,
              no waiting for an expert to visit, no cost per scan. Just point,
              upload, and know. As we grow, our mission stays the same —
              putting early, accurate plant health information directly into
              the hands of the people who depend on their harvest most.
            </p>
          </div>
          <div style={s.missionBanner}>
            <img
              src="https://images.unsplash.com/photo-1673746759526-375ad76cb399?auto=format&fit=crop&w=1200&q=70"
              alt="A farmer examining crops in a field"
              style={s.missionBannerImg}
            />
            <div style={s.missionBannerOverlay} />
            <p style={s.missionBannerCaption}>Built for the people who work the land every day.</p>
          </div>
          <div style={s.impactGrid}>
            <div style={s.impactCard}>
              <span style={s.impactIcon}>⚡</span>
              <h3 style={s.impactTitle}>Earlier action</h3>
              <p style={s.impactText}>
                Catching blight in its early stages means the difference
                between losing a few leaves and losing an entire field.
              </p>
            </div>
            <div style={s.impactCard}>
              <span style={s.impactIcon}>💰</span>
              <h3 style={s.impactTitle}>Lower costs</h3>
              <p style={s.impactText}>
                Accurate diagnosis means farmers apply the right treatment at
                the right time, instead of guessing or over-spraying.
              </p>
            </div>
            <div style={s.impactCard}>
              <span style={s.impactIcon}>🌍</span>
              <h3 style={s.impactTitle}>Accessible anywhere</h3>
              <p style={s.impactText}>
                All it takes is a phone camera — no special equipment or
                expert knowledge needed to get a diagnosis.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- FOOTER ---------------- */}
      <footer id="contact" style={s.footer}>
        <div style={s.footerInner}>
          <div style={s.footerBrand}>
            <div style={s.brand}>
              <img src="/favicon.svg" alt="LeafGuard AI logo" style={{ width: 32, height: 32 }} />
              <span style={s.brandName}>LeafGuard AI</span>
            </div>
            <p style={s.footerTagline}>
              Our mission is to help farmers protect their crops with fast,
              accessible, AI-powered disease detection.
            </p>
          </div>
          <div style={s.footerContact}>
            <h4 style={s.footerHeading}>Contact</h4>
            <p style={s.footerText}>✉ shawalkhan5298@gmail.com</p>
            <p style={s.footerText}>☎ 0565250330</p>
          </div>
        </div>
        <div style={s.footerBottom}>
          <p style={s.footerCopy}>© {new Date().getFullYear()} LeafGuard AI. Built to help farmers grow healthier crops.</p>
        </div>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles — dark navy / black theme with a blue-teal diagnostic accent.
// ---------------------------------------------------------------------------
const s = {
  page: {
    background: "#0A0E12",
    color: "#E7EEF5",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    minHeight: "100vh",
  },

  // Nav
  nav: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    background: "rgba(10,14,18,0.85)",
    backdropFilter: "blur(10px)",
    borderBottom: "1px solid #1F3350",
  },
  navInner: {
    maxWidth: "1160px",
    margin: "0 auto",
    padding: "16px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { display: "flex", alignItems: "center", gap: "10px" },
  brandMark: { color: "#1D4ED8", fontSize: "22px" },
  brandName: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 700,
    fontSize: "18px",
    letterSpacing: "0.3px",
  },
  navLinks: { display: "flex", gap: "28px" },
  navLink: {
    color: "#8CA0B3",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 500,
  },

  // Hero
  hero: {
    borderBottom: "1px solid #1F3350",
    background:
      "radial-gradient(circle at 80% 20%, rgba(76,159,232,0.10), transparent 45%), #0A0E12",
  },
  heroInner: {
    maxWidth: "1160px",
    margin: "0 auto",
    padding: "80px 24px",
    display: "grid",
    gridTemplateColumns: "1.1fr 0.9fr",
    gap: "48px",
    alignItems: "center",
  },
  heroLeft: {},
  eyebrow: {
    display: "inline-block",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "12px",
    letterSpacing: "1.5px",
    color: "#1D4ED8",
    marginBottom: "18px",
  },
  heroTitle: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: "42px",
    lineHeight: 1.15,
    fontWeight: 700,
    margin: "0 0 20px 0",
    color: "#F4F8FC",
  },
  heroText: {
    fontSize: "16px",
    lineHeight: 1.7,
    color: "#8CA0B3",
    margin: "0 0 32px 0",
    maxWidth: "520px",
  },
  heroButtons: { display: "flex", gap: "16px", marginBottom: "48px" },
  primaryBtn: {
    background: "#1D4ED8",
    color: "#F4F8FC",
    border: "none",
    padding: "14px 28px",
    borderRadius: "8px",
    fontWeight: 700,
    fontSize: "14px",
    cursor: "pointer",
  },
  secondaryBtn: {
    color: "#E7EEF5",
    textDecoration: "none",
    padding: "14px 8px",
    fontWeight: 600,
    fontSize: "14px",
    alignSelf: "center",
  },
  heroStats: { display: "flex", alignItems: "center", gap: "24px" },
  statBlock: { display: "flex", flexDirection: "column" },
  statNumber: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "22px",
    fontWeight: 700,
    color: "#F4F8FC",
  },
  statLabel: { fontSize: "12px", color: "#8CA0B3", marginTop: "2px" },
  statDivider: { width: "1px", height: "32px", background: "#1F3350" },

  heroRight: { display: "flex", justifyContent: "center" },
  scanFrame: {
    position: "relative",
    width: "320px",
    height: "320px",
  },
  scanFrameGlow: {
    position: "absolute",
    inset: "-30px",
    background: "radial-gradient(circle, rgba(76,159,232,0.18), transparent 70%)",
  },
  scanFrameInner: {
    position: "relative",
    width: "100%",
    height: "100%",
    border: "1px solid #2DD4BF55",
    borderRadius: "16px",
    background: "#0F1A2B",
    overflow: "hidden",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  scanFrameImg: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  scanFrameOverlay: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(180deg, rgba(10,14,18,0.15) 0%, rgba(10,14,18,0.85) 100%)",
  },
  scanFrameText: {
    position: "relative",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "12px",
    color: "#2DD4BF",
    letterSpacing: "0.5px",
    marginBottom: "20px",
  },
  scanCorner1: { position: "absolute", top: "12px", left: "12px", width: "18px", height: "18px", borderTop: "2px solid #1D4ED8", borderLeft: "2px solid #1D4ED8" },
  scanCorner2: { position: "absolute", top: "12px", right: "12px", width: "18px", height: "18px", borderTop: "2px solid #1D4ED8", borderRight: "2px solid #1D4ED8" },
  scanCorner3: { position: "absolute", bottom: "12px", left: "12px", width: "18px", height: "18px", borderBottom: "2px solid #1D4ED8", borderLeft: "2px solid #1D4ED8" },
  scanCorner4: { position: "absolute", bottom: "12px", right: "12px", width: "18px", height: "18px", borderBottom: "2px solid #1D4ED8", borderRight: "2px solid #1D4ED8" },

  // Generic section
  section: { padding: "90px 24px", borderBottom: "1px solid #1F3350" },
  sectionAlt: { padding: "90px 24px", borderBottom: "1px solid #1F3350", background: "#0C1219" },
  sectionInner: { maxWidth: "1160px", margin: "0 auto" },
  sectionTitle: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: "32px",
    fontWeight: 700,
    margin: "0 0 16px 0",
    color: "#F4F8FC",
  },
  sectionSubtext: {
    fontSize: "15px",
    lineHeight: 1.7,
    color: "#8CA0B3",
    maxWidth: "680px",
    marginBottom: "40px",
  },

  // Animated demo
  demoCard: {
    background: "#0F1A2B",
    border: "1px solid #1F3350",
    borderRadius: "16px",
    overflow: "hidden",
    maxWidth: "480px",
  },
  demoWindowBar: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "10px 14px",
    borderBottom: "1px solid #1F3350",
  },
  demoDot: { width: "8px", height: "8px", borderRadius: "50%", background: "#2A3F5C" },
  demoUrl: { marginLeft: "8px", fontSize: "11px", color: "#5C7086", fontFamily: "'JetBrains Mono', monospace" },
  demoBody: { padding: "28px", minHeight: "280px", display: "flex", flexDirection: "column", justifyContent: "center" },
  demoDropzone: { border: "2px dashed #2A3F5C", borderRadius: "14px", padding: "36px 20px", textAlign: "center" },
  demoPreviewWrap: { position: "relative", overflow: "hidden", borderRadius: "12px", border: "1px solid #1F3350", marginBottom: "16px" },
  demoPreviewImg: { width: "100%", height: "180px", objectFit: "cover", display: "block" },
  demoDots: { display: "flex", justifyContent: "center", gap: "6px", padding: "16px" },
  demoDotIndicator: { width: "6px", height: "6px", borderRadius: "50%", background: "#1F3350", transition: "background 0.3s ease" },
  demoDotIndicatorActive: { background: "#1D4ED8" },

  // Scan layout (two-column: scanner + tips sidebar)
  futureBanner: {
    display: "flex",
    alignItems: "flex-start",
    gap: "14px",
    background: "rgba(29,78,216,0.08)",
    border: "1px solid #1D4ED8",
    borderLeft: "4px solid #1D4ED8",
    borderRadius: "10px",
    padding: "16px 20px",
    marginBottom: "20px",
    maxWidth: "760px",
  },
  futureBannerIcon: { fontSize: "20px", lineHeight: 1 },
  futureBannerText: { margin: 0, fontSize: "14px", lineHeight: 1.6, color: "#DCE6F0" },

  helpBanner: {
    position: "relative",
    borderRadius: "14px",
    overflow: "hidden",
    height: "200px",
    marginBottom: "40px",
    maxWidth: "760px",
  },
  helpBannerImg: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" },
  helpBannerOverlay: { position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(10,14,18,0.92) 30%, rgba(10,14,18,0.35) 100%)" },
  helpBannerContent: { position: "relative", height: "100%", display: "flex", alignItems: "center", padding: "0 28px" },
  helpBannerText: { color: "#F4F8FC", fontSize: "15px", lineHeight: 1.6, maxWidth: "380px", margin: 0, fontFamily: "'Space Grotesk', sans-serif" },

  scanLayout: { display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "24px", alignItems: "start" },
  scanCard: {
    background: "#0F1A2B",
    border: "1px solid #1F3350",
    borderRadius: "16px",
    overflow: "hidden",
  },
  scanCardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 24px",
    borderBottom: "1px solid #1F3350",
    background: "#0C1420",
  },
  scanCardHeaderLeft: { display: "flex", alignItems: "center", gap: "10px" },
  statusDot: { width: "8px", height: "8px", borderRadius: "50%", display: "inline-block" },
  scanCardHeaderTitle: { fontFamily: "'Space Grotesk', sans-serif", fontSize: "14px", fontWeight: 700, color: "#F4F8FC" },
  scanCardHeaderStatus: { fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "#5C7086", letterSpacing: "0.5px" },
  scanCardBody: { padding: "32px" },

  // Tips sidebar
  tipsCard: {
    background: "#0F1A2B",
    border: "1px solid #1F3350",
    borderRadius: "16px",
    padding: "26px",
  },
  tipsTitle: { fontFamily: "'Space Grotesk', sans-serif", fontSize: "15px", color: "#F4F8FC", margin: "0 0 16px 0" },
  tipsList: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "12px" },
  tipsItem: { display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "13px", color: "#B8C4D0", lineHeight: 1.5 },
  tipsCheck: { color: "#2DD4BF", fontWeight: 700, flexShrink: 0 },
  tipsDivider: { height: "1px", background: "#1F3350", margin: "20px 0" },
  tipsFootnote: { fontSize: "12px", color: "#5C7086", lineHeight: 1.6, margin: 0 },

  dropzone: {
    border: "2px dashed #2A3F5C",
    borderRadius: "14px",
    padding: "52px 20px 40px 20px",
    textAlign: "center",
    cursor: "pointer",
    background: "radial-gradient(circle at 50% 0%, rgba(29,78,216,0.08), transparent 60%), #0C1420",
    transition: "all 0.2s ease",
  },
  dropzoneActive: { borderColor: "#1D4ED8", background: "#0F1E30" },
  dropzoneRing: {
    width: "68px",
    height: "68px",
    borderRadius: "50%",
    background: "linear-gradient(180deg, rgba(29,78,216,0.18), rgba(29,78,216,0.04))",
    border: "1px solid #2A3F5C",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px auto",
  },
  uploadIconBadge: {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    background: "#1D4ED8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadIconGlyph: { fontSize: "20px", color: "#F4F8FC" },
  dropText: { margin: "0 0 4px 0", fontSize: "16px", fontWeight: 600, color: "#E7EEF5" },
  dropSubtextStrong: { margin: "0 0 18px 0", fontSize: "13px", color: "#5C9FE8" },
  dropDivider: { width: "40px", height: "1px", background: "#1F3350", margin: "0 auto 14px auto" },
  dropSubtext: { margin: 0, fontSize: "12px", color: "#5C7086" },

  previewWrap: { textAlign: "center" },
  previewImgWrap: { position: "relative", overflow: "hidden", borderRadius: "12px", border: "1px solid #1F3350" },
  previewImg: { width: "100%", maxHeight: "300px", objectFit: "cover", display: "block" },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: "2px",
    background: "linear-gradient(90deg, transparent, #2DD4BF, transparent)",
    boxShadow: "0 0 12px 2px #2DD4BF",
    animation: "scanmove 1.6s ease-in-out infinite",
  },
  newImageBtn: {
    marginTop: "16px",
    background: "transparent",
    border: "1px solid #2A3F5C",
    color: "#8CA0B3",
    padding: "9px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
  },

  loadingWrap: { textAlign: "center", marginTop: "24px" },
  spinner: {
    width: "28px",
    height: "28px",
    border: "3px solid #1F3350",
    borderTop: "3px solid #1D4ED8",
    borderRadius: "50%",
    margin: "0 auto 10px auto",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: { color: "#8CA0B3", fontSize: "13px", fontFamily: "'JetBrains Mono', monospace" },

  errorBox: {
    marginTop: "20px",
    background: "#2A1214",
    border: "1px solid #EF444455",
    color: "#FCA5A5",
    padding: "14px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    lineHeight: 1.6,
  },

  resultBox: { marginTop: "28px", textAlign: "left" },
  resultLabel: { margin: "0 0 4px 0", color: "#5C7086", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1.5px", fontFamily: "'JetBrains Mono', monospace" },
  resultValue: { margin: "0 0 4px 0", fontSize: "30px", fontFamily: "'Space Grotesk', sans-serif" },
  resultTag: { margin: "0 0 16px 0", fontSize: "13px", color: "#8CA0B3" },
  confidenceBarBg: { background: "#1F3350", borderRadius: "8px", height: "8px", overflow: "hidden" },
  confidenceBarFill: { height: "100%", borderRadius: "8px", transition: "width 0.5s ease" },
  confidenceText: { marginTop: "8px", fontSize: "12px", color: "#8CA0B3", fontFamily: "'JetBrains Mono', monospace" },

  infoGrid: { marginTop: "28px", display: "flex", flexDirection: "column", gap: "20px" },
  infoBlock: { borderTop: "1px solid #1F3350", paddingTop: "18px" },
  infoHeading: { margin: "0 0 8px 0", fontSize: "13px", fontFamily: "'Space Grotesk', sans-serif", color: "#1D4ED8", textTransform: "uppercase", letterSpacing: "0.5px" },
  infoText: { margin: 0, fontSize: "14px", lineHeight: 1.7, color: "#B8C4D0" },
  infoList: { margin: 0, paddingLeft: "18px", fontSize: "14px", lineHeight: 1.8, color: "#B8C4D0" },

  // Steps
  stepsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" },
  stepCard: { background: "#0F1A2B", border: "1px solid #1F3350", borderRadius: "12px", padding: "28px", overflow: "hidden" },
  stepImg: { width: "calc(100% + 56px)", margin: "-28px -28px 20px -28px", height: "120px", objectFit: "cover", display: "block" },
  stepNumber: { fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", color: "#2DD4BF" },
  stepTitle: { fontFamily: "'Space Grotesk', sans-serif", fontSize: "19px", margin: "12px 0 8px 0", color: "#F4F8FC" },
  stepText: { fontSize: "14px", lineHeight: 1.7, color: "#8CA0B3", margin: 0 },

  // ML section
  mlGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" },
  mlCard: { padding: "0" },
  mlCardTitle: { fontFamily: "'Space Grotesk', sans-serif", fontSize: "18px", color: "#F4F8FC", margin: "0 0 10px 0" },
  mlCardText: { fontSize: "14px", lineHeight: 1.7, color: "#8CA0B3", margin: 0 },

  stakesGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", alignItems: "center" },
  stakesText: {},
  stakesTitle: { fontFamily: "'Space Grotesk', sans-serif", fontSize: "30px", fontWeight: 700, margin: "0 0 16px 0", color: "#F4F8FC", lineHeight: 1.25 },
  stakesSubtext: { fontSize: "15px", lineHeight: 1.7, color: "#8CA0B3", margin: "0 0 32px 0" },
  stakesStatRow: { display: "flex", gap: "28px" },
  stakesStat: { display: "flex", flexDirection: "column", borderLeft: "2px solid #1D4ED8", paddingLeft: "14px" },
  stakesStatNumber: { fontFamily: "'Space Grotesk', sans-serif", fontSize: "20px", fontWeight: 700, color: "#F4F8FC" },
  stakesStatLabel: { fontSize: "12px", color: "#8CA0B3", marginTop: "4px", maxWidth: "140px", lineHeight: 1.5 },
  fieldFrame: { position: "relative", borderRadius: "16px", overflow: "hidden", border: "1px solid #1F3350", height: "320px" },
  fieldFrameImg: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" },
  fieldFrameTag: {
    position: "absolute",
    left: "16px",
    bottom: "16px",
    background: "rgba(10,14,18,0.75)",
    border: "1px solid #1F3350",
    borderRadius: "6px",
    padding: "6px 12px",
    fontSize: "11px",
    fontFamily: "'JetBrains Mono', monospace",
    color: "#F5A623",
    letterSpacing: "0.3px",
  },

  // Mission
  missionSection: { padding: "90px 24px", borderBottom: "1px solid #1F3350", background: "linear-gradient(180deg, #0A0E12, #0C1420)" },
  missionIntro: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: "40px" },
  missionLogo: { width: "72px", height: "72px", marginBottom: "20px" },
  missionBanner: { position: "relative", borderRadius: "14px", overflow: "hidden", height: "220px", marginBottom: "40px" },
  missionBannerImg: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" },
  missionBannerOverlay: { position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(10,14,18,0.9) 0%, rgba(10,14,18,0.15) 60%)" },
  missionBannerCaption: { position: "absolute", left: "24px", bottom: "20px", color: "#F4F8FC", fontFamily: "'Space Grotesk', sans-serif", fontSize: "17px", margin: 0, maxWidth: "420px" },
  impactGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" },
  impactCard: { background: "#0F1A2B", border: "1px solid #1F3350", borderRadius: "12px", padding: "28px" },
  impactIcon: { fontSize: "24px" },
  impactTitle: { fontFamily: "'Space Grotesk', sans-serif", fontSize: "17px", margin: "14px 0 8px 0", color: "#F4F8FC" },
  impactText: { fontSize: "14px", lineHeight: 1.7, color: "#8CA0B3", margin: 0 },

  // Footer
  footer: { padding: "56px 24px 0 24px" },
  footerInner: { maxWidth: "1160px", margin: "0 auto", display: "flex", justifyContent: "space-between", gap: "40px", flexWrap: "wrap", paddingBottom: "40px" },
  footerBrand: { maxWidth: "360px" },
  footerTagline: { fontSize: "13px", lineHeight: 1.7, color: "#5C7086", marginTop: "12px" },
  footerContact: {},
  footerHeading: { fontFamily: "'Space Grotesk', sans-serif", fontSize: "14px", color: "#F4F8FC", margin: "0 0 12px 0" },
  footerText: { fontSize: "13px", color: "#8CA0B3", margin: "0 0 6px 0" },
  footerBottom: { borderTop: "1px solid #1F3350", padding: "20px 24px", textAlign: "center" },
  footerCopy: { fontSize: "12px", color: "#5C7086", margin: 0 },
};

export default ImageUpload;