/**
 * NOTE: This file is for reference/deployment only. 
 * It runs on the Firebase Node.js backend, not in the React browser app.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

/**
 * 1. Generate Rabbit Tag (Atomic Transaction)
 * Input: { farmId, breedCode, originCode }
 */
export const generateTag = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  
  const { farmId, breedCode, originCode } = data;
  
  // Validate farm ownership
  const farmRef = db.doc(`farms/${farmId}`);
  const farmSnap = await farmRef.get();
  if (!farmSnap.exists || farmSnap.data()?.ownerUid !== context.auth.uid) {
    throw new functions.https.HttpsError('permission-denied', 'Not farm owner');
  }

  const counterRef = farmRef.collection('counters').doc('rabbits');

  return db.runTransaction(async (t) => {
    const doc = await t.get(counterRef);
    let seq = 1;
    if (doc.exists) {
      seq = doc.data()?.lastSequence + 1;
    }

    t.set(counterRef, { lastSequence: seq }, { merge: true });

    // Format: SN-REX-0001
    const farmName = farmSnap.data()?.name || "FARM";
    const farmCode = farmName.substring(0, 2).toUpperCase();
    const seqStr = seq.toString().padStart(4, '0');
    
    // Logic: {Farm}-{Breed}-{Seq} (Simplified)
    const tag = `${farmCode}-${breedCode.toUpperCase()}-${seqStr}`;
    return { tag, seq };
  });
});

/**
 * 2. Daily Scheduler
 * Runs every day to check for upcoming events and send notifications
 */
export const dailyScheduler = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const today = now.toDate();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    // 1. Check upcoming deliveries (Expected Delivery Date)
    const farmsSnapshot = await db.collection('farms').get();

    for (const farmDoc of farmsSnapshot.docs) {
        const farmId = farmDoc.id;
        
        // Query crossings where expectedDeliveryDate is close
        const crossingsRef = db.collection(`farms/${farmId}/crossings`);
        const snapshot = await crossingsRef
            .where('status', '==', 'ConfirmedPregnancy')
            .where('expectedDeliveryDate', '<=', threeDaysFromNow)
            .where('expectedDeliveryDate', '>=', today)
            .get();

        snapshot.forEach(doc => {
            const data = doc.data();
            // Send Notification logic here (Push/Email)
            console.log(`Notification: Rabbit ${data.doeId} due for delivery soon.`);
            
            // Write to Firestore notifications collection
            db.collection(`farms/${farmId}/notifications`).add({
                type: 'Delivery',
                message: `Doe ${data.doeId} is due for delivery on ${data.expectedDeliveryDate.toDate().toDateString()}`,
                read: false,
                createdAt: now
            });
        });
    }
});
