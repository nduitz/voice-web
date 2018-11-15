"use strict";
/**
 * We're splitting the dataset into three buckets; train, dev and test. That's a common technique
 * in ML: https://stats.stackexchange.com/a/19051
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IDEAL_SPLIT = Object.freeze({
    train: 0.6,
    dev: 0.2,
    test: 0.2,
});
const sumValues = (split) => Object.values(split).reduce((sum, n) => sum + n, 0);
function normalize(split) {
    const totalCount = sumValues(split) || 1;
    return Object.entries(split)
        .map(([key, count]) => [key, count / totalCount])
        .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
    }, {});
}
exports.normalize = normalize;
/**
 * Given a real split, in absolute numbers (i.e. count of occurrences) calculate a compensatory
 * split which would move the real data closer to the split defined as IDEAL_SPLIT.
 */
function calculateCompensatorySplit(realSplit) {
    const compensatorySplit = {};
    // Normalize the real split (so that the values sum up to 1) and set the split to the difference
    // from the ideal (or zero)
    for (const [bucket, count] of Object.entries(normalize(realSplit))) {
        const typedBucket = bucket;
        compensatorySplit[typedBucket] = Math.max(exports.IDEAL_SPLIT[typedBucket] - count, 0);
    }
    // When the value sum up to 0, we're already at the ideal split
    return sumValues(compensatorySplit) === 0
        ? exports.IDEAL_SPLIT
        : normalize(compensatorySplit);
}
exports.calculateCompensatorySplit = calculateCompensatorySplit;
/**
 * Given a distribution, pick a random bucket based on the compensatory split of that distribution.
 */
function randomBucketFromDistribution(distribution) {
    const random = Math.random();
    let totalProbability = 0;
    return Object.entries(calculateCompensatorySplit(distribution)).find(([key, probability]) => {
        totalProbability += probability;
        if (random < totalProbability)
            return true;
    })[0];
}
exports.randomBucketFromDistribution = randomBucketFromDistribution;
function rowsToDistribution(rows) {
    return rows
        .filter(({ bucket }) => Object.keys(exports.IDEAL_SPLIT).includes(bucket))
        .reduce((obj, { bucket, count }) => (Object.assign({}, obj, { [bucket]: count })), {
        train: 0,
        dev: 0,
        test: 0,
    });
}
exports.rowsToDistribution = rowsToDistribution;
//# sourceMappingURL=split.js.map