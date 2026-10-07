import { useEffect, useRef, useState } from 'react';
import '../styles/WasteClassifier.css';

let modelPromise;

const getWasteCategory = (label) => {
    const normalized = label.toLowerCase();
    if (/banana|apple|orange|lemon|pineapple|broccoli|cabbage|cauliflower|corn|mushroom|strawberry|potato|cucumber|zucchini|food/.test(normalized)) return 'ORGANIC';
    if (/bottle|can|carton|box|tin|paper|newspaper|envelope|cardboard|plastic|glass/.test(normalized)) return 'RECYCLABLE';
    return 'GENERAL';
};

function WasteClassifier() {
    const imageRef = useRef(null);
    const [imageUrl, setImageUrl] = useState('');
    const [predictions, setPredictions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => () => {
        if (imageUrl) URL.revokeObjectURL(imageUrl);
    }, [imageUrl]);

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        setPredictions([]);
        setError('');
        if (!file) {
            setImageUrl('');
            return;
        }
        setImageUrl('');
        if (!file.type.startsWith('image/')) {
            setError('Choose an image file.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setError('Image must be 5 MB or smaller.');
            return;
        }
        setImageUrl(URL.createObjectURL(file));
    };

    const classifyImage = async () => {
        if (!imageRef.current) return;
        setIsLoading(true);
        setError('');
        try {
            modelPromise ||= Promise.all([
                import('@tensorflow/tfjs'),
                import('@tensorflow-models/mobilenet')
            ]).then(async ([tf, mobilenet]) => {
                await tf.ready();
                return mobilenet.load({ version: 2, alpha: 1.0 });
            });
            const model = await modelPromise;
            setPredictions(await model.classify(imageRef.current, 3));
        } catch (classificationError) {
            modelPromise = undefined;
            setError(classificationError.message || 'Could not load the image model. Check your internet connection and retry.');
        } finally {
            setIsLoading(false);
        }
    };

    const topPrediction = predictions[0];

    return (
        <section className="waste-classifier">
            <header className="classifier-header">
                <div>
                    <p className="eyebrow">IMAGE ASSIST</p>
                    <h1>Waste image classifier</h1>
                    <p>Upload a clear item photo for an on-device category suggestion.</p>
                </div>
                <span className="classifier-model">MobileNet · ImageNet</span>
            </header>

            <div className="classifier-layout">
                <div className="classifier-input">
                    <label htmlFor="waste-image">Choose an item image</label>
                    <input id="waste-image" type="file" accept="image/*" onChange={handleFileChange} />
                    {imageUrl && <img ref={imageRef} className="classifier-preview" src={imageUrl} alt="Selected waste item" onLoad={() => setPredictions([])} />}
                    {error && <p className="classifier-error" role="alert">{error}</p>}
                    <button type="button" className="classify-button" onClick={classifyImage} disabled={!imageUrl || isLoading}>
                        {isLoading ? 'Loading model and classifying...' : 'Suggest category'}
                    </button>
                    <p className="classifier-note">First use downloads the model. Images are processed in this browser and are not uploaded.</p>
                </div>

                <div className="classifier-results" aria-live="polite">
                    <h2>Prediction</h2>
                    {topPrediction ? (
                        <>
                            <p className="prediction-category">Suggested category <strong>{getWasteCategory(topPrediction.className)}</strong></p>
                            <p className="prediction-label">{topPrediction.className}</p>
                            <p className="classifier-note">General object recognition is mapped to waste groups; verify the suggestion before sorting.</p>
                            <h3>Other likely labels</h3>
                            <ul>
                                {predictions.map((prediction) => (
                                    <li key={prediction.className}>
                                        <span>{prediction.className}</span>
                                        <span>{Math.round(prediction.probability * 100)}%</span>
                                    </li>
                                ))}
                            </ul>
                        </>
                    ) : <p className="classifier-empty">Select a photo to see likely object labels and a category suggestion.</p>}
                </div>
            </div>
        </section>
    );
}

export default WasteClassifier;