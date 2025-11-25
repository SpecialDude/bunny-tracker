import { db, auth } from '../firebase';
import { Rabbit, RabbitStatus, Sex, Transaction, TransactionType, Hutch } from '../types';

// Hardcoded Farm ID for Development/MVP
export const CURRENT_FARM_ID = 'farm-default-001';

const COLLECTION_RABBITS = `farms/${CURRENT_FARM_ID}/rabbits`;
const COLLECTION_HUTCHES = `farms/${CURRENT_FARM_ID}/hutches`;
const COLLECTION_TRANSACTIONS = `farms/${CURRENT_FARM_ID}/transactions`;

// Helper to convert Firestore timestamp to ISO date string
const convertDoc = (doc: any): any => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    // Safely convert Timestamps if they exist
    dateOfBirth: data.dateOfBirth?.toDate ? data.dateOfBirth.toDate().toISOString().split('T')[0] : data.dateOfBirth,
    dateOfAcquisition: data.dateOfAcquisition?.toDate ? data.dateOfAcquisition.toDate().toISOString().split('T')[0] : data.dateOfAcquisition,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
  };
};

const getUserId = () => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");
  return user.uid;
};

export const FarmService = {
  // --- Rabbits ---

  async getRabbits(): Promise<Rabbit[]> {
    try {
      // Filter by ownerUid to satisfy security rules
      const user = auth.currentUser;
      if (!user) return [];

      const snapshot = await db.collection(COLLECTION_RABBITS)
        .where('ownerUid', '==', user.uid)
        .orderBy('createdAt', 'desc')
        .get();
      return snapshot.docs.map(doc => convertDoc(doc) as Rabbit);
    } catch (error) {
      console.error("Error fetching rabbits:", error);
      throw error;
    }
  },

  async getRabbitsBySex(sex: Sex): Promise<Rabbit[]> {
    try {
      const user = auth.currentUser;
      if (!user) return [];

      const snapshot = await db.collection(COLLECTION_RABBITS)
        .where('ownerUid', '==', user.uid)
        .where('sex', '==', sex)
        .where('status', 'in', ['Alive', 'Pregnant', 'Weaned'])
        .get();
      return snapshot.docs.map(doc => convertDoc(doc) as Rabbit);
    } catch (error) {
      console.error(`Error fetching ${sex} rabbits:`, error);
      return [];
    }
  },

  // Handle single purchase or single/bulk birth
  async addRabbit(
    rabbitData: Omit<Rabbit, 'id' | 'farmId' | 'rabbitId'>, 
    isPurchase: boolean,
    kitCount: number = 1
  ): Promise<void> {
    const userId = getUserId();
    const batch = db.batch();
    const timestamp = new Date();

    // Loop for Kit Count (if born on farm, typically > 1)
    for (let i = 0; i < kitCount; i++) {
      const newRabbitRef = db.collection(COLLECTION_RABBITS).doc();
      
      let finalTag = rabbitData.tag;
      if (kitCount > 1) {
        finalTag = `${rabbitData.tag}-${(i + 1)}`;
      }

      const docData = {
        ...rabbitData,
        tag: finalTag,
        rabbitId: newRabbitRef.id,
        farmId: CURRENT_FARM_ID,
        ownerUid: userId,
        createdAt: timestamp,
        updatedAt: timestamp,
        dateOfBirth: rabbitData.dateOfBirth ? new Date(rabbitData.dateOfBirth) : null,
        dateOfAcquisition: rabbitData.dateOfAcquisition ? new Date(rabbitData.dateOfAcquisition) : timestamp,
      };

      batch.set(newRabbitRef, docData);

      // If Purchase, add transaction linked to the first rabbit for simplicity (or split cost)
      if (isPurchase && i === 0 && rabbitData.purchaseCost && rabbitData.purchaseCost > 0) {
        const txnRef = db.collection(COLLECTION_TRANSACTIONS).doc();
        const txnData: Transaction & { ownerUid: string } = {
          id: txnRef.id,
          farmId: CURRENT_FARM_ID,
          ownerUid: userId,
          type: TransactionType.Expense,
          category: 'Livestock Purchase',
          amount: rabbitData.purchaseCost * kitCount, // Total cost for the batch
          date: new Date().toISOString(),
          relatedId: newRabbitRef.id,
          notes: `Purchase of ${kitCount} rabbit(s). Tag start: ${rabbitData.tag}`
        };
        batch.set(txnRef, {
            ...txnData,
            date: new Date()
        });
      }
    }

    try {
      await batch.commit();
    } catch (error) {
      console.error("Error processing rabbit batch:", error);
      throw error;
    }
  },

  async updateRabbit(id: string, updates: Partial<Rabbit>): Promise<void> {
    try {
      // Ensure we don't overwrite ownerUid or critical fields accidentally, but allow updates
      await db.collection(COLLECTION_RABBITS).doc(id).update({
        ...updates,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error("Error updating rabbit:", error);
      throw error;
    }
  },

  async deleteRabbit(id: string): Promise<void> {
    try {
      await db.collection(COLLECTION_RABBITS).doc(id).delete();
    } catch (error) {
      console.error("Error deleting rabbit:", error);
      throw error;
    }
  },

  async generateNextTag(breedCode: string): Promise<string> {
    const user = auth.currentUser;
    if (!user) return `SN-${breedCode.substring(0,3)}-000`; // Fallback

    const snapshot = await db.collection(COLLECTION_RABBITS)
      .where('ownerUid', '==', user.uid)
      .get();
      
    const count = snapshot.size + 1;
    const seq = count.toString().padStart(3, '0');
    return `SN-${breedCode.toUpperCase().substring(0,3)}-${seq}`;
  },

  // --- Hutches ---

  async getHutches(): Promise<Hutch[]> {
    try {
      const user = auth.currentUser;
      if (!user) return [];

      const snapshot = await db.collection(COLLECTION_HUTCHES)
        .where('ownerUid', '==', user.uid)
        .orderBy('number', 'asc')
        .get();
      return snapshot.docs.map(doc => convertDoc(doc) as Hutch);
    } catch (error) {
      console.error("Error fetching hutches:", error);
      throw error;
    }
  },

  async addHutch(data: Omit<Hutch, 'id' | 'farmId' | 'currentOccupancy'>): Promise<void> {
    try {
      const userId = getUserId();
      const docRef = db.collection(COLLECTION_HUTCHES).doc();
      const hutchId = `H${data.number.toString().padStart(2, '0')}`;
      
      await docRef.set({
        ...data,
        id: docRef.id,
        hutchId: hutchId,
        currentOccupancy: 0,
        farmId: CURRENT_FARM_ID,
        ownerUid: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } catch (error) {
      console.error("Error adding hutch:", error);
      throw error;
    }
  },

  async updateHutch(id: string, updates: Partial<Hutch>): Promise<void> {
    try {
      await db.collection(COLLECTION_HUTCHES).doc(id).update({
        ...updates,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error("Error updating hutch:", error);
      throw error;
    }
  },

  async deleteHutch(id: string): Promise<void> {
    try {
      await db.collection(COLLECTION_HUTCHES).doc(id).delete();
    } catch (error) {
      console.error("Error deleting hutch:", error);
      throw error;
    }
  }
};