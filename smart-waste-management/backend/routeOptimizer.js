const calculateDistance = (first, second) => {
    const earthRadiusKm = 6371;
    const latitudeDelta = (second.latitude - first.latitude) * Math.PI / 180;
    const longitudeDelta = (second.longitude - first.longitude) * Math.PI / 180;
    const firstLatitude = first.latitude * Math.PI / 180;
    const secondLatitude = second.latitude * Math.PI / 180;
    const haversine = Math.sin(latitudeDelta / 2) ** 2
        + Math.cos(firstLatitude) * Math.cos(secondLatitude)
        * Math.sin(longitudeDelta / 2) ** 2;

    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

const shuffle = (items) => {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index--) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
};

const splitIntoRoutes = (order, vehicleCapacity) => {
    const routes = [];
    let route = [];
    let load = 0;

    for (const bin of order) {
        const demand = Math.max(0, Number(bin.fillLevel) || 0);
        if (route.length && load + demand > vehicleCapacity) {
            routes.push(route);
            route = [];
            load = 0;
        }
        route.push(bin);
        load += demand;
        if (load > vehicleCapacity) {
            routes.push(route);
            route = [];
            load = 0;
        }
    }

    if (route.length) routes.push(route);
    return routes;
};

const evaluate = (order, depot, vehicleCount, vehicleCapacity) => {
    const routes = splitIntoRoutes(order, vehicleCapacity);
    let distance = 0;
    let feasible = routes.length <= vehicleCount;

    for (const route of routes) {
        let previous = depot;
        let load = 0;
        for (const bin of route) {
            distance += calculateDistance(previous, bin);
            previous = bin;
            load += Math.max(0, Number(bin.fillLevel) || 0);
        }
        distance += calculateDistance(previous, depot);
        if (load > vehicleCapacity) feasible = false;
    }

    return { routes, distance, feasible, score: feasible ? distance : Number.POSITIVE_INFINITY };
};

const calculateRouteDistance = (routes, depot) => routes.reduce((totalDistance, route) => {
    let previous = depot;
    let routeDistance = 0;
    for (const bin of route) {
        routeDistance += calculateDistance(previous, bin);
        previous = bin;
    }
    if (route.length) routeDistance += calculateDistance(previous, depot);
    return totalDistance + routeDistance;
}, 0);

const orderedCrossover = (parentA, parentB) => {
    if (parentA.length < 2) return [...parentA];
    const start = Math.floor(Math.random() * parentA.length);
    const end = start + 1 + Math.floor(Math.random() * (parentA.length - start));
    const child = Array(parentA.length).fill(null);
    const segment = parentA.slice(start, end);
    child.splice(start, segment.length, ...segment);
    const remaining = parentB.filter((bin) => !segment.includes(bin));
    let cursor = 0;
    for (let index = 0; index < child.length; index++) {
        if (child[index] === null) child[index] = remaining[cursor++];
    }
    return child;
};

const optimizeRoutes = ({ bins, depot, vehicleCount = 1, vehicleCapacity = 300 }) => {
    if (!bins.length) return { routes: [], totalDistance: 0, method: 'genetic-algorithm' };

    let population = [[...bins], ...Array.from({ length: 47 }, () => shuffle(bins))];
    let best;

    for (let generation = 0; generation < 120; generation++) {
        const evaluated = population
            .map((order) => ({ order, result: evaluate(order, depot, vehicleCount, vehicleCapacity) }))
            .sort((first, second) => first.result.score - second.result.score);
        const feasibleCandidate = evaluated.find(({ result }) => result.feasible);
        if (feasibleCandidate && (!best || feasibleCandidate.result.score < best.result.score)) {
            best = feasibleCandidate;
        }

        const nextPopulation = evaluated.slice(0, 4).map(({ order }) => order);
        while (nextPopulation.length < population.length) {
            const parentA = evaluated[Math.floor(Math.random() * Math.min(12, evaluated.length))].order;
            const parentB = evaluated[Math.floor(Math.random() * Math.min(12, evaluated.length))].order;
            const child = orderedCrossover(parentA, parentB);
            if (child.length > 1 && Math.random() < 0.25) {
                const firstIndex = Math.floor(Math.random() * child.length);
                const secondIndex = Math.floor(Math.random() * child.length);
                [child[firstIndex], child[secondIndex]] = [child[secondIndex], child[firstIndex]];
            }
            nextPopulation.push(child);
        }
        population = nextPopulation;
    }

    if (!best) {
        return { routes: [], totalDistance: 0, method: 'genetic-algorithm', feasible: false };
    }

    const finalEvaluation = evaluate(best.order, depot, vehicleCount, vehicleCapacity);
    const baselineRoutes = splitIntoRoutes(bins, vehicleCapacity);
    const baselineDistance = calculateRouteDistance(baselineRoutes, depot);
    const routeEfficiencyPct = baselineDistance === 0
        ? 0
        : Number((((baselineDistance - finalEvaluation.distance) / baselineDistance) * 100).toFixed(1));
    return {
        routes: finalEvaluation.routes.map((route, index) => ({
            vehicle: index + 1,
            bins: route,
            load: Number(route.reduce((total, bin) => total + (Number(bin.fillLevel) || 0), 0).toFixed(1)),
            distance: Number(route.reduce((total, bin, index) => {
                const previous = index === 0 ? depot : route[index - 1];
                return total + calculateDistance(previous, bin);
            }, 0) + calculateDistance(route[route.length - 1], depot)).toFixed(2)
        })),
        totalDistance: Number(finalEvaluation.distance.toFixed(2)),
        baselineDistance: Number(baselineDistance.toFixed(2)),
        routeEfficiencyPct,
        method: 'genetic-algorithm',
        feasible: true,
        vehicleCount,
        vehicleCapacity
    };
};

module.exports = { optimizeRoutes };