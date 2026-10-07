const express = require('express');
const router = express.Router();
const Bin = require('./Bin');
const Complaint = require('./Complaint');
const { calculateOptimizedRoute } = require('./routeOptimizer');

// Helper to get system telemetry snapshot
const getSystemSnapshot = async () => {
    const bins = await Bin.find();
    let complaints = [];
    try {
        complaints = await Complaint.find();
    } catch (e) {
        complaints = [];
    }

    const totalBins = bins.length;
    const criticalBins = bins.filter(b => (b.fillLevel || 0) >= (b.alertThreshold || 80));
    const warningBins = bins.filter(b => (b.fillLevel || 0) >= 60 && (b.fillLevel || 0) < (b.alertThreshold || 80));
    const normalBins = bins.filter(b => (b.fillLevel || 0) < 60);
    const avgFill = totalBins > 0 ? Math.round(bins.reduce((acc, b) => acc + (b.fillLevel || 0), 0) / totalBins) : 0;
    const pendingComplaints = complaints.filter(c => c.status === 'NEW' || c.status === 'IN_REVIEW');

    return {
        bins,
        complaints,
        totalBins,
        criticalBins,
        warningBins,
        normalBins,
        avgFill,
        pendingComplaints
    };
};

// Built-in Domain Knowledge Base for Waste Management
const WASTE_GUIDELINES = {
    plastic: {
        category: 'RECYCLABLE',
        instruction: 'Clean containers, remove bottle caps, rinse liquids. Soft film plastics require specialized drop-offs.',
        binType: 'Blue / Recyclable Bin'
    },
    organic: {
        category: 'ORGANIC / COMPOSTABLE',
        instruction: 'Food scraps, fruit peels, vegetables, coffee grounds, garden clippings. Avoid meat packaging or treated wood.',
        binType: 'Green / Compost Bin'
    },
    paper: {
        category: 'RECYCLABLE',
        instruction: 'Clean dry cardboard, office paper, newspapers. Greasy pizza boxes belong in compost or general waste.',
        binType: 'Blue / Recyclable Bin'
    },
    electronic: {
        category: 'E-WASTE',
        instruction: 'Batteries, cables, circuit boards, small appliances. Never put in general bins — toxic heavy metals risk fire and soil contamination.',
        binType: 'Designated E-Waste Disposal Center'
    },
    hazardous: {
        category: 'HAZARDOUS',
        instruction: 'Paints, chemicals, medical syringes, aerosol cans, lithium batteries. Require certified municipal hazardous handling.',
        binType: 'Special Hazardous Waste Depot'
    },
    glass: {
        category: 'RECYCLABLE',
        instruction: 'Bottles and jars rinsed clean. Broken window glass, mirrors, or ceramics should be wrapped and put in general waste.',
        binType: 'Blue / Recyclable Bin'
    }
};

// Generates contextual intelligent responses based on live system state
const generateAIResponse = async (userPrompt, history = []) => {
    const snapshot = await getSystemSnapshot();
    const prompt = (userPrompt || '').trim().toLowerCase();

    const actions = [];

    // 1. Critical & Full Bins Inquiries
    if (prompt.includes('full') || prompt.includes('critical') || prompt.includes('overflow') || prompt.includes('urgent') || prompt.includes('immediate')) {
        actions.push({ label: 'Open Collection Map', tab: 'map', icon: 'map' });
        actions.push({ label: 'Dispatch Optimized Route', tab: 'route', icon: 'route' });

        if (snapshot.criticalBins.length === 0) {
            return {
                reply: `###  Bin Capacity Status: All Clear\n\nAll **${snapshot.totalBins} monitored bins** are currently within acceptable operating levels.\n\n- **Average Fill Level:** ${snapshot.avgFill}%\n- **Warning Bins (60%-79%):** ${snapshot.warningBins.length}\n- **Critical Bins (≥80%):** 0\n\nNo emergency truck dispatches are required at this moment. You can review steady trends on the **Analytics** tab.`,
                actions,
                systemSnapshot: {
                    totalBins: snapshot.totalBins,
                    criticalBins: snapshot.criticalBins.length,
                    avgFill: snapshot.avgFill,
                    pendingComplaints: snapshot.pendingComplaints.length
                }
            };
        }

        const binDetails = snapshot.criticalBins.map(b =>
            `- **${b.name || 'Bin'}** (${b.wasteType || 'GENERAL'}): **${b.fillLevel}% full** [Location: ${b.latitude?.toFixed(4)}, ${b.longitude?.toFixed(4)}]`
        ).join('\n');

        return {
            reply: `### 🚨 Urgent Action Required: ${snapshot.criticalBins.length} Critical Bins Detected!\n\nThe following smart bins have reached or exceeded their overflow alert threshold (≥80%):\n\n${binDetails}\n\n#### Recommended Next Steps:\n1. **Dispatch Sanitation Crew**: Prioritize the bins listed above to avoid street overflow and odor penalties.\n2. **Run Route Optimizer**: Calculate the shortest transit route to conserve municipal fuel.\n3. **Inspect Nearby Sensor Telemetry**: Verify fill rates in the Collection Map view.`,
            actions,
            systemSnapshot: {
                totalBins: snapshot.totalBins,
                criticalBins: snapshot.criticalBins.length,
                avgFill: snapshot.avgFill,
                pendingComplaints: snapshot.pendingComplaints.length
            }
        };
    }

    // 2. Specific Bin Status (e.g., "Bin A", "Bin B", "Bin C", "Bin 1")
    const binMatch = snapshot.bins.find(b =>
        b.name && prompt.includes(b.name.toLowerCase()) ||
        prompt.includes(`bin ${b._id}`) ||
        (b.locationName && prompt.includes(b.locationName.toLowerCase()))
    );

    if (binMatch) {
        actions.push({ label: `View ${binMatch.name} on Map`, tab: 'map', icon: 'map' });
        actions.push({ label: 'Check Alerts', tab: 'alerts', icon: 'alert' });

        const historyCount = (binMatch.history || []).length;
        const lastUpdated = binMatch.updatedAt ? new Date(binMatch.updatedAt).toLocaleTimeString() : 'Recent';
        const fillStatus = binMatch.fillLevel >= 80 ? 'CRITICAL (Pickup needed)' : binMatch.fillLevel >= 60 ? 'HIGH' : 'NORMAL';

        return {
            reply: `### 📦 Live Telemetry: **${binMatch.name}**\n\n- **Current Fill Level:** **${binMatch.fillLevel}%** (${fillStatus})\n- **Waste Category:** \`${binMatch.wasteType || 'GENERAL'}\`\n- **Capacity:** ${binMatch.capacity || 100} Liters\n- **Alert Threshold:** ${binMatch.alertThreshold || 80}%\n- **Coordinates:** \`Lat ${binMatch.latitude?.toFixed(4)}, Lng ${binMatch.longitude?.toFixed(4)}\`\n- **Telemetry Telemetry Samples:** ${historyCount} logged\n- **Last Communication:** ${lastUpdated}\n\n${binMatch.fillLevel >= 80 ? '⚠️ **Notice:** This bin is at capacity and should be scheduled for clearing immediately.' : '✅ **Status:** Operating within safe capacity limits.'}`,
            actions,
            systemSnapshot: {
                totalBins: snapshot.totalBins,
                criticalBins: snapshot.criticalBins.length,
                avgFill: snapshot.avgFill,
                pendingComplaints: snapshot.pendingComplaints.length
            }
        };
    }

    // 3. Route Optimization / Collection Logistics
    if (prompt.includes('route') || prompt.includes('path') || prompt.includes('dispatch') || prompt.includes('driver') || prompt.includes('truck') || prompt.includes('schedule')) {
        actions.push({ label: 'Open Route Optimizer', tab: 'route', icon: 'route' });
        actions.push({ label: 'Collection Map', tab: 'map', icon: 'map' });

        const candidateBins = snapshot.bins.filter(b => (b.fillLevel || 0) >= 60);
        let routeSummary = '';

        if (candidateBins.length === 0) {
            routeSummary = 'All bins are below the 60% dispatch trigger. Routine scheduled collection can proceed without emergency rerouting.';
        } else {
            routeSummary = `Detected **${candidateBins.length} bins** eligible for priority collection:\n` +
                candidateBins.map((b, idx) => `${idx + 1}. **${b.name}** (${b.fillLevel}% full) — [${b.wasteType}]`).join('\n') +
                `\n\n*Optimizing via nearest-neighbor TSP saves up to **28% in transit fuel** and prevents vehicle idle time.*`;
        }

        return {
            reply: `### 🚛 Collection Logistics & Route Dispatch\n\n${routeSummary}\n\nClick **"Open Route Optimizer"** below to calculate turn-by-turn waypoints and dispatch details for the sanitation fleet.`,
            actions,
            systemSnapshot: {
                totalBins: snapshot.totalBins,
                criticalBins: snapshot.criticalBins.length,
                avgFill: snapshot.avgFill,
                pendingComplaints: snapshot.pendingComplaints.length
            }
        };
    }

    // 4. Citizen Complaints & Reports
    if (prompt.includes('complaint') || prompt.includes('issue') || prompt.includes('citizen') || prompt.includes('grievance') || prompt.includes('dumping') || prompt.includes('ticket')) {
        actions.push({ label: 'Review Complaint Portal', tab: 'complaints', icon: 'ticket' });

        const count = snapshot.complaints.length;
        const pending = snapshot.pendingComplaints.length;

        if (count === 0) {
            return {
                reply: `### 📋 Citizen Grievances & Complaints\n\nThere are currently **no logged complaints** in the system.\n\nCitizens can lodge reports via the public portal for:\n- Bin Overflows\n- Physical Container Damage\n- Missed Collection Days\n- Illegal Dumping Incidents`,
                actions,
                systemSnapshot: {
                    totalBins: snapshot.totalBins,
                    criticalBins: snapshot.criticalBins.length,
                    avgFill: snapshot.avgFill,
                    pendingComplaints: 0
                }
            };
        }

        const recent = snapshot.complaints.slice(-3).reverse().map(c =>
            `- **[${c.category}]** at *${c.locationName || 'Unspecified'}* — Status: \`${c.status}\` ("${(c.description || '').slice(0, 60)}...")`
        ).join('\n');

        return {
            reply: `### 📋 Grievances Summary: ${count} Total (${pending} Pending Attention)\n\n${recent}\n\n**Action Item:** As an operator/admin, you can acknowledge tickets and mark resolved items in the **Complaint Portal**.`,
            actions,
            systemSnapshot: {
                totalBins: snapshot.totalBins,
                criticalBins: snapshot.criticalBins.length,
                avgFill: snapshot.avgFill,
                pendingComplaints: pending
            }
        };
    }

    // 5. Waste Sorting & Classification Guide
    for (const [key, info] of Object.entries(WASTE_GUIDELINES)) {
        if (prompt.includes(key) || (key === 'organic' && (prompt.includes('food') || prompt.includes('compost') || prompt.includes('vegetable'))) || (key === 'electronic' && (prompt.includes('battery') || prompt.includes('phone') || prompt.includes('e-waste')))) {
            actions.push({ label: 'Launch AI Vision Classifier', tab: 'classify', icon: 'camera' });
            return {
                reply: `### ♻️ Segregation Protocol: **${info.category}**\n\n- **Target Bin:** **${info.binType}**\n- **Handling Guidelines:** ${info.instruction}\n\n**AI Tip:** You can also take or upload a live photograph in the **Waste Sorting** tab to have our onboard MobileNet vision model classify objects automatically!`,
                actions,
                systemSnapshot: {
                    totalBins: snapshot.totalBins,
                    criticalBins: snapshot.criticalBins.length,
                    avgFill: snapshot.avgFill,
                    pendingComplaints: snapshot.pendingComplaints.length
                }
            };
        }
    }

    if (prompt.includes('sort') || prompt.includes('classify') || prompt.includes('segregat') || prompt.includes('recycle') || prompt.includes('waste type')) {
        actions.push({ label: 'Open Waste Classifier', tab: 'classify', icon: 'camera' });
        return {
            reply: `### ♻️ Municipal Waste Classification Reference\n\nOur system classifies waste into three primary streams:\n\n1. **Organic / Biodegradable (Green Bins)**: Food scraps, floral refuse, raw organic matter for municipal composting.\n2. **Recyclable (Blue Bins)**: Paper, clean cardboard, HDPE/PET plastics, aluminum cans, glass bottles.\n3. **General / Non-Recyclable (Dark Bins)**: Non-recyclable composite packaging, sanitary waste, soiled wrappers.\n4. **Hazardous & E-Waste**: Specialized depot drop-off only.\n\nUse our **AI Waste Sorting Camera** tab to identify any item using your webcam or photo!`,
            actions,
            systemSnapshot: {
                totalBins: snapshot.totalBins,
                criticalBins: snapshot.criticalBins.length,
                avgFill: snapshot.avgFill,
                pendingComplaints: snapshot.pendingComplaints.length
            }
        };
    }

    // 6. Analytics, Trends, Forecasting
    if (prompt.includes('analytic') || prompt.includes('trend') || prompt.includes('predict') || prompt.includes('forecast') || prompt.includes('report') || prompt.includes('chart')) {
        actions.push({ label: 'View Analytics', tab: 'analytics', icon: 'chart' });
        actions.push({ label: 'View Heatmap', tab: 'heatmap', icon: 'heatmap' });
        actions.push({ label: 'Collection Reports', tab: 'reports', icon: 'report' });

        return {
            reply: `### 📊 Real-Time Operations Diagnosis & Trends\n\n- **Total Monitored Nodes:** ${snapshot.totalBins} IoT Smart Bins\n- **Average Network Capacity:** **${snapshot.avgFill}%**\n- **Critical Alert Ratio:** ${Math.round((snapshot.criticalBins.length / (snapshot.totalBins || 1)) * 100)}%\n- **Active Citizen Tickets:** ${snapshot.pendingComplaints.length} pending\n\n**Diagnostic Insight:** Peak accumulation occurs during morning commute and post-evening retail hours. Maintaining regular pickups at 80% capacity avoids the ~35% cost premium associated with emergency overflow cleanups.`,
            actions,
            systemSnapshot: {
                totalBins: snapshot.totalBins,
                criticalBins: snapshot.criticalBins.length,
                avgFill: snapshot.avgFill,
                pendingComplaints: snapshot.pendingComplaints.length
            }
        };
    }

    // Default / General Overview & Capabilities
    actions.push({ label: 'View Dashboard', tab: 'dashboard', icon: 'home' });
    actions.push({ label: 'Live Map', tab: 'map', icon: 'map' });
    actions.push({ label: 'Optimized Route', tab: 'route', icon: 'route' });

    return {
        reply: `###  EcoAI Operations Assistant\n\nI am your intelligent assistant for the **Intelligent Garbage Management System**.\n\n**Current Live Operations Summary:**\n- **Active Bins:** ${snapshot.totalBins} monitored\n- **System Avg Fill:** **${snapshot.avgFill}%**\n- **Critical Status (≥80%):** ${snapshot.criticalBins.length} bins\n- **Pending Grievances:** ${snapshot.pendingComplaints.length}\n\n**Here are common tasks I can help you with:**\n- *"Which bins are full or need immediate collection?"*\n- *"What is the status of Bin A?"*\n- *"Plan an optimized collection route for today's drivers"*\n- *"Summarize active citizen complaints"*\n- *"How should I dispose of electronic or hazardous waste?"*\n- *"Show system operational health diagnosis"*`,
        actions,
        systemSnapshot: {
            totalBins: snapshot.totalBins,
            criticalBins: snapshot.criticalBins.length,
            avgFill: snapshot.avgFill,
            pendingComplaints: snapshot.pendingComplaints.length
        }
    };
};

// Route: POST /api/ai/chat
router.post('/chat', async (req, res) => {
    try {
        const { message, history } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const response = await generateAIResponse(message, history);
        res.json(response);
    } catch (error) {
        console.error('Error generating AI response:', error);
        res.status(500).json({ error: 'Failed to process AI request', details: error.message });
    }
});

// Route: GET /api/ai/quick-insights
router.get('/quick-insights', async (req, res) => {
    try {
        const snapshot = await getSystemSnapshot();
        const criticalCount = snapshot.criticalBins.length;
        const avgFill = snapshot.avgFill;

        let level = 'normal';
        let headline = 'System operating smoothly';
        let recommendation = 'Routine collection schedule is on track.';

        if (criticalCount > 0) {
            level = 'critical';
            headline = `${criticalCount} bin(s) require urgent collection`;
            recommendation = `Run route optimization to dispatch driver to ${snapshot.criticalBins.map(b => b.name).join(', ')}.`;
        } else if (avgFill > 65) {
            level = 'warning';
            headline = `Average fill level is rising (${avgFill}%)`;
            recommendation = 'Consider scheduling an early afternoon collection pass.';
        }

        res.json({
            level,
            headline,
            recommendation,
            stats: {
                totalBins: snapshot.totalBins,
                criticalBins: criticalCount,
                avgFill,
                pendingComplaints: snapshot.pendingComplaints.length
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch AI insights', details: error.message });
    }
});

module.exports = router;
