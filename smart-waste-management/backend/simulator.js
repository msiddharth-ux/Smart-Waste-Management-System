const Bin = require('./Bin');

const simulateBins = async (io) => {

    setInterval(async () => {

        const bins = await Bin.find();

        for (let bin of bins) {

            let increase = Math.floor(Math.random() * 20);

            bin.fillLevel += increase;

            if (bin.fillLevel > 100) {
                bin.fillLevel = 100;
            }

            // Update status based on alert threshold
            if (bin.fillLevel >= bin.alertThreshold) {
                bin.status = 'FULL';
                // Add to alert history
                bin.alertHistory.push({
                    type: 'FULL_ALERT',
                    timestamp: new Date(),
                    fillLevel: bin.fillLevel
                });
            } else {
                bin.status = 'NORMAL';
            }

            // Add to history for analytics
            bin.history.push({
                fillLevel: bin.fillLevel,
                timestamp: new Date()
            });

            // Keep only last 100 history entries
            if (bin.history.length > 100) {
                bin.history.shift();
            }

            await bin.save();
        }

        const updatedBins = await Bin.find();

        io.emit('binsUpdated', updatedBins);

    }, 10000);
};

module.exports = simulateBins;