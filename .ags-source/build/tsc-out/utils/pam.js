//@ts-expect-error missing types
import GUtils from 'gi://GUtils';
export function authenticate(password) {
    return new Promise((resolve, reject) => {
        GUtils.authenticate(password, 0, null, (_, res) => {
            try {
                resolve(GUtils.authenticate_finish(res));
            }
            catch (e) {
                reject(e);
            }
        });
    });
}
export function authenticateUser(username, password) {
    return new Promise((resolve, reject) => {
        GUtils.authenticate_user(username, password, 0, null, (_, res) => {
            try {
                resolve(GUtils.authenticate_finish(res));
            }
            catch (e) {
                reject(e);
            }
        });
    });
}
