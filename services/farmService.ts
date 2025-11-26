import { db, auth } from '../firebase';
import { Rabbit, RabbitStatus, Sex, Transaction, TransactionType, Hutch, Crossing, CrossingStatus, Delivery, Sale, Farm, UserProfile } from '../types';

// Default Settings Fallback
const DEFAULT_SETTINGS = {
  gestationDays: 31,
  palpationDays: 14,
  weaningDays: 35
};

// --- MOCK STORAGE FOR DEMO MODE ---
// If the user is in "Demo Mode", we use this in-memory store instead of Firestore
let MOCK_STORE: any = {
  farms: {},
  rabbits: [],
  hutches: [],
  transactions: [],
  crossings: []
};

// Check if we are in Demo Mode (auth.currentUser is null but we proceeded)
// OR if using the explicit mock flag
const isDemoMode = () => {
  return !auth.currentUser; // Simple check: If no firebase user, assume demo
};

// Helper to get current authenticated user ID
const getUserId = () => {
  if (isDemoMode()) return 'demo-user-123';
  if (!auth.currentUser) {
    throw new Error("User must be logged in to access farm data.");
  }
  return auth.currentUser.uid;
};

// Helper to get the Farm ID for the current user
const getFarmId = () => {
  return `farm-${getUserId()}`;
};

// Helper to convert Firestore timestamp to ISO date string
const convertDoc = (doc: any): any => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    dateOfBirth: data.dateOfBirth?.toDate ? data.dateOfBirth.toDate().toISOString().split('T')[0] : data.dateOfBirth,
    dateOfAcquisition: data.dateOfAcquisition?.toDate ? data.dateOfAcquisition.toDate().toISOString().split('T')[0] : data.dateOfAcquisition,
    dateOfCrossing: data.dateOfCrossing?.toDate ? data.dateOfCrossing.toDate().toISOString().split('T')[0] : data.dateOfCrossing,
    expectedDeliveryDate: data.expectedDeliveryDate?.toDate ? data.expectedDeliveryDate.toDate().toISOString().split('T')[0] : data.expectedDeliveryDate,
    expectedPalpationDate: data.expectedPalpationDate?.toDate ? data.expectedPalpationDate.toDate().toISOString().split('T')[0] : data.expectedPalpationDate,
    date: data.date?.toDate ? data.date.toDate().toISOString().split('T')[0] : data.date,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
  };
};

export const FarmService = {
  // --- User & Onboarding ---

  async syncUser(user: any): Promise<void> {
    if (isDemoMode()) return;
    try {
      const userRef = db.collection('users').doc(user.uid);
      const payload: UserProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        lastLogin: new Date().toISOString()
      };
      await userRef.set(payload, { merge: true });
    } catch (e) {
      console.error("Failed to sync user profile:", e);
    }
  },

  async getFarm(): Promise<Farm | null> {
    if (isDemoMode()) {
       // Return a mock farm so demo mode skips onboarding
       return {
         farmId: 'farm-demo',
         name: 'Demo Rabbitry',
         ownerUid: 'demo-user-123',
         timezone: 'UTC',
         currency: 'USD',
         defaultGestationDays: 31,
         defaultWeaningDays: 35,
         defaultPalpationDays: 14,
         createdAt: new Date()
       };
    }

    const farmId = getFarmId();
    const doc = await db.collection('farms').doc(farmId).get();
    if (doc.exists) {
      return convertDoc(doc) as Farm;
    }
    return null;
  },

  async createFarm(settings: { name: string, currency: string, timezone: string }): Promise<void> {
    const userId = getUserId();
    const farmId = getFarmId();
    
    if (isDemoMode()) return; // Should not happen in demo flow really

    await db.collection('farms').doc(farmId).set({
      farmId: farmId,
      ownerUid: userId,
      name: settings.name,
      currency: settings.currency,
      timezone: settings.timezone,
      defaultGestationDays: DEFAULT_SETTINGS.gestationDays,
      defaultWeaningDays: DEFAULT_SETTINGS.weaningDays,
      defaultPalpationDays: DEFAULT_SETTINGS.palpationDays,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  },

  // --- Farm Settings ---

  async getFarmSettings(): Promise<Farm> {
    const farm = await this.getFarm();
    if (farm) return farm;

    // Fallback if accessed before creation (should be handled by Onboarding gate)
    return {
      farmId: getFarmId(),
      name: 'My Rabbit Farm',
      ownerUid: getUserId(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      currency: 'USD',
      defaultGestationDays: DEFAULT_SETTINGS.gestationDays,
      defaultWeaningDays: DEFAULT_SETTINGS.weaningDays,
      defaultPalpationDays: DEFAULT_SETTINGS.palpationDays,
      createdAt: new Date()
    };
  },

  async updateFarmSettings(settings: Partial<Farm>): Promise<void> {
    if (isDemoMode()) return;
    const farmId = getFarmId();
    await db.collection('farms').doc(farmId).set({
      ...settings,
      farmId: farmId, // Ensure ID is set
      ownerUid: getUserId(), // Ensure ownership
      updatedAt: new Date()
    }, { merge: true });
  },

  async exportFarmData(): Promise<any> {
    const rabbits = await this.getRabbits();
    const hutches = await this.getHutches();
    const crossings = await this.getCrossings();
    const transactions = await this.getTransactions();
    
    return {
      farmId: getFarmId(),
      exportedAt: new Date().toISOString(),
      rabbits,
      hutches,
      crossings,
      transactions
    };
  },

  // --- Rabbits ---

  async getRabbits(): Promise<Rabbit[]> {
    if (isDemoMode()) return MOCK_STORE.rabbits;
    try {
      const farmId = getFarmId();
      const snapshot = await db.collection(`farms/${farmId}/rabbits`)
        .orderBy('createdAt', 'desc')
        .get();
      return snapshot.docs.map(doc => convertDoc(doc) as Rabbit);
    } catch (error) {
      console.error("Error fetching rabbits:", error);
      throw error;
    }
  },

  async getRabbitsBySex(sex: Sex): Promise<Rabbit[]> {
    if (isDemoMode()) return MOCK_STORE.rabbits.filter((r: Rabbit) => r.sex === sex);
    try {
      const farmId = getFarmId();
      const snapshot = await db.collection(`farms/${farmId}/rabbits`)
        .where('sex', '==', sex)
        .where('status', 'in', ['Alive', 'Pregnant', 'Weaned'])
        .get();
      return snapshot.docs.map(doc => convertDoc(doc) as Rabbit);
    } catch (error) {
      console.error(`Error fetching ${sex} rabbits:`, error);
      return [];
    }
  },

  async getSaleableRabbits(): Promise<Rabbit[]> {
    if (isDemoMode()) return MOCK_STORE.rabbits.filter((r: Rabbit) => ['Alive', 'Weaned', 'Pregnant'].includes(r.status));
    try {
      const farmId = getFarmId();
      const snapshot = await db.collection(`farms/${farmId}/rabbits`)
        .where('status', 'in', [RabbitStatus.Alive, RabbitStatus.Weaned, RabbitStatus.Pregnant])
        .get();
      return snapshot.docs.map(doc => convertDoc(doc) as Rabbit);
    } catch (error) {
      console.error("Error fetching saleable rabbits:", error);
      return [];
    }
  },

  async addRabbit(
    rabbitData: Omit<Rabbit, 'id' | 'farmId' | 'rabbitId'>, 
    isPurchase: boolean,
    kitCount: number = 1
  ): Promise<void> {
    const userId = getUserId();
    const farmId = getFarmId();
    const timestamp = new Date();

    if (isDemoMode()) {
        for (let i = 0; i < kitCount; i++) {
            const id = 'mock-rabbit-' + Math.random();
            MOCK_STORE.rabbits.push({
                ...rabbitData,
                id,
                rabbitId: id,
                farmId,
                tag: kitCount > 1 ? `${rabbitData.tag}-${i+1}` : rabbitData.tag,
                createdAt: timestamp
            });
        }
        return;
    }

    const batch = db.batch();

    for (let i = 0; i < kitCount; i++) {
      const newRabbitRef = db.collection(`farms/${farmId}/rabbits`).doc();
      
      let finalTag = rabbitData.tag;
      if (kitCount > 1) {
        finalTag = `${rabbitData.tag}-${(i + 1)}`;
      }

      const docData = {
        ...rabbitData,
        tag: finalTag,
        rabbitId: newRabbitRef.id,
        farmId: farmId,
        ownerUid: userId,
        createdAt: timestamp,
        updatedAt: timestamp,
        dateOfBirth: rabbitData.dateOfBirth ? new Date(rabbitData.dateOfBirth) : null,
        dateOfAcquisition: rabbitData.dateOfAcquisition ? new Date(rabbitData.dateOfAcquisition) : timestamp,
      };

      batch.set(newRabbitRef, docData);

      // Simple Transaction logic for purchases
      if (isPurchase && i === 0 && rabbitData.purchaseCost && rabbitData.purchaseCost > 0) {
        const txnRef = db.collection(`farms/${farmId}/transactions`).doc();
        batch.set(txnRef, {
          id: txnRef.id,
          farmId: farmId,
          ownerUid: userId,
          type: TransactionType.Expense,
          category: 'Livestock Purchase',
          amount: rabbitData.purchaseCost * kitCount,
          date: new Date().toISOString(),
          relatedId: newRabbitRef.id,
          notes: `Purchase of ${kitCount} rabbit(s). Tag start: ${rabbitData.tag}`
        });
      }
    }

    await batch.commit();
  },

  async updateRabbit(id: string, updates: Partial<Rabbit>): Promise<void> {
    if (isDemoMode()) {
        const idx = MOCK_STORE.rabbits.findIndex((r: Rabbit) => r.id === id);
        if (idx !== -1) MOCK_STORE.rabbits[idx] = { ...MOCK_STORE.rabbits[idx], ...updates };
        return;
    }
    const farmId = getFarmId();
    await db.collection(`farms/${farmId}/rabbits`).doc(id).update({
      ...updates,
      updatedAt: new Date()
    });
  },

  async generateNextTag(breedCode: string): Promise<string> {
    if (isDemoMode()) {
        const count = MOCK_STORE.rabbits.length + 1;
        return `SN-${breedCode.substring(0,3).toUpperCase()}-${count.toString().padStart(3,'0')}`;
    }
    const farmId = getFarmId();
    const snapshot = await db.collection(`farms/${farmId}/rabbits`).get();
    const count = snapshot.size + 1;
    const seq = count.toString().padStart(3, '0');
    return `SN-${breedCode.toUpperCase().substring(0,3)}-${seq}`;
  },

  // --- Hutches ---

  async getHutches(): Promise<Hutch[]> {
    if (isDemoMode()) return MOCK_STORE.hutches;
    const farmId = getFarmId();
    const snapshot = await db.collection(`farms/${farmId}/hutches`)
      .orderBy('number', 'asc')
      .get();
    return snapshot.docs.map(doc => convertDoc(doc) as Hutch);
  },

  async addHutch(data: Omit<Hutch, 'id' | 'farmId' | 'currentOccupancy'>): Promise<void> {
    if (isDemoMode()) {
        const id = 'mock-hutch-' + Math.random();
        MOCK_STORE.hutches.push({ ...data, id, hutchId: `H${data.number}`, currentOccupancy: 0, farmId: 'demo' });
        return;
    }
    const userId = getUserId();
    const farmId = getFarmId();
    const docRef = db.collection(`farms/${farmId}/hutches`).doc();
    const hutchId = `H${data.number.toString().padStart(2, '0')}`;
    
    await docRef.set({
      ...data,
      id: docRef.id,
      hutchId: hutchId,
      currentOccupancy: 0,
      farmId: farmId,
      ownerUid: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  },

  async updateHutch(id: string, updates: Partial<Hutch>): Promise<void> {
    if (isDemoMode()) return;
    const farmId = getFarmId();
    await db.collection(`farms/${farmId}/hutches`).doc(id).update({
      ...updates,
      updatedAt: new Date()
    });
  },

  // --- Breeding & Deliveries ---

  async getCrossings(): Promise<Crossing[]> {
    if (isDemoMode()) return MOCK_STORE.crossings;
    const farmId = getFarmId();
    const snapshot = await db.collection(`farms/${farmId}/crossings`)
      .orderBy('dateOfCrossing', 'desc')
      .get();
    return snapshot.docs.map(doc => convertDoc(doc) as Crossing);
  },

  async addCrossing(data: Omit<Crossing, 'id' | 'farmId' | 'status' | 'expectedDeliveryDate' | 'expectedPalpationDate'>): Promise<void> {
    if (isDemoMode()) {
        MOCK_STORE.crossings.push({
            ...data, id: 'mock-cross-'+Math.random(), status: CrossingStatus.Pending, 
            expectedPalpationDate: new Date().toISOString(), expectedDeliveryDate: new Date().toISOString()
        });
        return;
    }

    const userId = getUserId();
    const farmId = getFarmId();
    const docRef = db.collection(`farms/${farmId}/crossings`).doc();
    
    let settings: Farm;
    try {
      settings = await this.getFarmSettings();
    } catch {
      settings = { defaultGestationDays: 31, defaultPalpationDays: 14 } as Farm; 
    }
    
    const crossingDate = new Date(data.dateOfCrossing);
    const palpDate = new Date(crossingDate);
    palpDate.setDate(palpDate.getDate() + settings.defaultPalpationDays);
    
    const deliveryDate = new Date(crossingDate);
    deliveryDate.setDate(deliveryDate.getDate() + settings.defaultGestationDays);

    await docRef.set({
      ...data,
      id: docRef.id,
      status: CrossingStatus.Pending,
      expectedPalpationDate: palpDate,
      expectedDeliveryDate: deliveryDate,
      farmId: farmId,
      ownerUid: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  },

  async updateCrossingStatus(id: string, status: CrossingStatus, result?: 'Positive' | 'Negative'): Promise<void> {
    if (isDemoMode()) {
        const c = MOCK_STORE.crossings.find((x: Crossing) => x.id === id);
        if (c) { c.status = status; if(result) c.palpationResult = result; }
        return;
    }
    const farmId = getFarmId();
    const updateData: any = { status, updatedAt: new Date() };
    if (result) updateData.palpationResult = result;
    
    const crossingRef = db.collection(`farms/${farmId}/crossings`).doc(id);
    const crossingSnap = await crossingRef.get();
    const crossing = crossingSnap.data() as Crossing;

    const batch = db.batch();
    batch.update(crossingRef, updateData);

    if (status === CrossingStatus.Pregnant && crossing.doeId) {
       const rabbits = await db.collection(`farms/${farmId}/rabbits`).where('tag', '==', crossing.doeId).get();
       if (!rabbits.empty) {
         batch.update(rabbits.docs[0].ref, { status: RabbitStatus.Pregnant });
       }
    }

    if (status === CrossingStatus.Failed && crossing.doeId) {
        const rabbits = await db.collection(`farms/${farmId}/rabbits`).where('tag', '==', crossing.doeId).get();
        if (!rabbits.empty) {
          batch.update(rabbits.docs[0].ref, { status: RabbitStatus.Alive });
        }
     }

    await batch.commit();
  },

  async recordDelivery(data: Omit<Delivery, 'id' | 'farmId'>): Promise<void> {
    if (isDemoMode()) return;
    const userId = getUserId();
    const farmId = getFarmId();
    const batch = db.batch();
    const timestamp = new Date();

    const deliveryRef = db.collection(`farms/${farmId}/deliveries`).doc();
    batch.set(deliveryRef, {
      ...data,
      id: deliveryRef.id,
      farmId: farmId,
      ownerUid: userId,
      createdAt: timestamp
    });

    const crossingRef = db.collection(`farms/${farmId}/crossings`).doc(data.crossingId);
    batch.update(crossingRef, { 
      status: CrossingStatus.Delivered,
      actualDeliveryDate: data.dateOfDelivery,
      updatedAt: timestamp 
    });

    const doeSnapshot = await db.collection(`farms/${farmId}/rabbits`).where('tag', '==', data.doeId).get();
    if (!doeSnapshot.empty) {
       batch.update(doeSnapshot.docs[0].ref, { status: RabbitStatus.Alive });
    }
    
    await batch.commit();
  },

  // --- Finances (Sales & Transactions) ---

  async getTransactions(): Promise<Transaction[]> {
    if (isDemoMode()) return MOCK_STORE.transactions;
    try {
      const farmId = getFarmId();
      const snapshot = await db.collection(`farms/${farmId}/transactions`)
        .orderBy('date', 'desc')
        .get();
      return snapshot.docs.map(doc => convertDoc(doc) as Transaction);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      throw error;
    }
  },

  async addTransaction(data: Omit<Transaction, 'id' | 'farmId'>): Promise<void> {
    if (isDemoMode()) {
        MOCK_STORE.transactions.push({ ...data, id: 'mock-txn-'+Math.random(), farmId: 'demo' });
        return;
    }
    const userId = getUserId();
    const farmId = getFarmId();
    const docRef = db.collection(`farms/${farmId}/transactions`).doc();
    
    await docRef.set({
      ...data,
      id: docRef.id,
      farmId: farmId,
      ownerUid: userId,
      createdAt: new Date(),
      date: new Date(data.date).toISOString() 
    });
  },

  async recordSale(data: Omit<Sale, 'id' | 'farmId' | 'saleId'>): Promise<void> {
    if (isDemoMode()) {
        const saleId = 'S-'+Math.random();
        MOCK_STORE.transactions.push({ 
            type: TransactionType.Income, category: 'Sale', amount: data.amount, date: data.date, notes: 'Mock Sale', farmId: 'demo'
        });
        return;
    }

    const userId = getUserId();
    const farmId = getFarmId();
    const batch = db.batch();
    const timestamp = new Date();
    
    const saleRef = db.collection(`farms/${farmId}/sales`).doc();
    const saleId = `S-${Math.floor(Date.now() / 1000).toString().substring(4)}`; 
    
    batch.set(saleRef, {
      ...data,
      id: saleRef.id,
      saleId: saleId,
      farmId: farmId,
      ownerUid: userId,
      createdAt: timestamp,
      date: new Date(data.date).toISOString()
    });

    const txnRef = db.collection(`farms/${farmId}/transactions`).doc();
    batch.set(txnRef, {
      id: txnRef.id,
      farmId: farmId,
      ownerUid: userId,
      type: TransactionType.Income,
      category: 'Rabbit Sale',
      amount: data.amount,
      date: new Date(data.date).toISOString(),
      relatedId: saleRef.id,
      notes: `Sale of ${data.rabbitIds.length} rabbit(s) to ${data.buyerName}. IDs: ${data.rabbitIds.join(', ')}`
    });

    for (const rId of data.rabbitIds) {
      const rabbitRef = db.collection(`farms/${farmId}/rabbits`).doc(rId);
      batch.update(rabbitRef, {
        status: RabbitStatus.Sold,
        currentHutchId: null,
        updatedAt: timestamp
      });
    }

    await batch.commit();
  }
};