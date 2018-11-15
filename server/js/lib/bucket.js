"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_helper_1 = require("../config-helper");
/**
 * Bucket
 *   The bucket class is responsible for loading clip
 *   metadata into the Model from s3.
 */
class Bucket {
    constructor(model, s3) {
        this.model = model;
        this.s3 = s3;
    }
    /**
     * Fetch a public url for the resource.
     */
    getPublicUrl(key) {
        return this.s3.getSignedUrl('getObject', {
            Bucket: config_helper_1.getConfig().BUCKET_NAME,
            Key: key,
            Expires: 24 * 60 * 30,
        });
    }
    /**
     * Grab metadata to play clip on the front end.
     */
    async getRandomClips(client_id, locale, count) {
        const clips = await this.model.findEligibleClips(client_id, locale, count);
        try {
            return await Promise.all(clips.map(async ({ id, path, sentence }) => {
                // We get a 400 from the signed URL without this request
                await this.s3
                    .headObject({
                    Bucket: config_helper_1.getConfig().BUCKET_NAME,
                    Key: path,
                })
                    .promise();
                return {
                    id,
                    glob: path.replace('.mp3', ''),
                    text: sentence,
                    sound: this.getPublicUrl(path),
                };
            }));
        }
        catch (e) {
            console.log('aws error', e, e.stack);
            return [];
        }
    }
}
exports.default = Bucket;
//# sourceMappingURL=bucket.js.map