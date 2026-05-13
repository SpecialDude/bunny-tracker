
import { db, auth } from '../firebase';
import { Rabbit, RabbitStatus, Sex, Transaction, TransactionType, Hutch, Crossing, CrossingStatus, Delivery, Sale, Farm, UserProfile, MedicalRecord, HutchOccupancy, AppNotification, WeightRecord, Customer, Breed } from '../types';

// Default Settings Fallback
const DEFAULT_SETTINGS = {
  gestationDays: 31,
  palpationDays: 14,
  weaningDays: 35
};

const DEFAULT_BREEDS: Breed[] = [
  { name: 'Rex', code: 'REX' },
  { name: 'New Zealand', code: 'NZW' },
  { name: 'California', code: 'CAL' },
  { name: 'Dutch', code: 'DUT' },
  { name: 'Chinchilla', code: 'CHI' },
  { name: 'Local / Mixed', code: 'LOC' }
];

const DEFAULT_TRANSACTION_CATEGORIES = [
  'Feed', 'Medication', 'Equipment', 'Maintenance', 
  'Utilities', 'Labor', 'Livestock Purchase', 'Rabbit Sale', 'Other'
];

// --- MOCK STORAGE FOR DEMO MODE ---
// If the user is in "Demo Mode", we use this in-memory store instead of Firestore
let MOCK_STORE: any = {
  farms: {},
  rabbits: [],
  hutches: [],
  transactions: [],
  crossings: [],
  deliveries: [],
  medical: [],
  occupancy: [],
  notifications: [],
  weights: [],
  customers: []
};

// Check if we are in Demo Mode (auth.currentUser is null but we proceeded)
// OR if using the explicit mock flag
const isDemoMode = () => {
  return !auth?.currentUser; // Simple check: If no firebase user, assume demo
};

// Helper to get current authenticated user ID
const getUserId = () => {
  if (isDemoMode()) return 'demo-user-123';
  if (!auth?.currentUser) {
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
  const result = {
    id: doc.id,
    ...data,
  };

  // Convert timestamps to ISO strings only if they exist
  const dateFields = [
    'dateOfBirth', 
    'dateOfAcquisition', 
    'dateOfCrossing', 
    'expectedDeliveryDate', 
    'expectedPalpationDate', 
    'actualDeliveryDate',
    'dateOfDelivery',
    'date',
    'nextDueDate',
    'startAt',
    'endAt',
    'createdAt',
    'lastPurchaseDate'
  ];

  dateFields.forEach(field => {
    if (result[field] && typeof result[field].toDate === 'function') {
      result[field] = result[field].toDate().toISOString().split('T')[0];
    }
  });

  if (result.createdAt && typeof result.createdAt.toDate === 'function') {
    result.createdAt = result.createdAt.toDate();
  }
  
  return result;
};

export const FarmService = {
  // Helper to ensure payloads don't contain undefined fields (which Firestore rejects)
  cleanPayload(data: any): any {
    const cleaned = { ...data };
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] === undefined) delete cleaned[key];
    });
    return cleaned;
  },

  // --- User & Onboarding ---

  async syncUser(user: any): Promise<void> {
    if (isDemoMode()) return;
    try {
      if (!db) throw new Error("DB not initialized");
      const userRef = db.collection('users').doc(user.uid);
      const payload: UserProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        lastLogin: new Date().toISOString()
      };
      await userRef.set(this.cleanPayload(payload), { merge: true });
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
         breeds: DEFAULT_BREEDS,
         transactionCategories: DEFAULT_TRANSACTION_CATEGORIES,
         createdAt: new Date()
       };
    }

    // Strict check: if no auth, return null immediately
    if (!auth?.currentUser) return null;

    try {
      if (!db) return null;
      const farmId = getFarmId();
      // Optimization: catch permission-denied errors which mean doc doesn't exist
      try {
        const doc = await db.collection('farms').doc(farmId).get();
        if (doc.exists) {
          const data = convertDoc(doc) as Farm;
          // Ensure defaults exist for older data
          if (!data.breeds) {
              data.breeds = DEFAULT_BREEDS;
          }
          if (!data.transactionCategories) {
              data.transactionCategories = DEFAULT_TRANSACTION_CATEGORIES;
          }
          return data;
        }
      } catch (err: any) {
        if (err.code === 'permission-denied') return null;
        throw err;
      }
    } catch (error: any) {
      // If permission denied or other error, assume no farm setup yet
      console.log("Farm check result:", error.code);
    }
    return null;
  },

  async createFarm(settings: { name: string, currency: string, timezone: string }): Promise<void> {
    const userId = getUserId();
    const farmId = getFarmId();
    
    if (isDemoMode()) return; // Should not happen in demo flow really
    if (!db) throw new Error("DB not initialized");

    await db.collection('farms').doc(farmId).set({
      farmId: farmId,
      ownerUid: userId,
      name: settings.name,
      currency: settings.currency,
      timezone: settings.timezone,
      defaultGestationDays: DEFAULT_SETTINGS.gestationDays,
      defaultWeaningDays: DEFAULT_SETTINGS.weaningDays,
      defaultPalpationDays: DEFAULT_SETTINGS.palpationDays,
      breeds: DEFAULT_BREEDS,
      transactionCategories: DEFAULT_TRANSACTION_CATEGORIES,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  },

  // --- Farm Settings & Reset ---

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
      breeds: DEFAULT_BREEDS,
      transactionCategories: DEFAULT_TRANSACTION_CATEGORIES,
      createdAt: new Date()
    };
  },

  async updateFarmSettings(settings: Partial<Farm>): Promise<void> {
    if (isDemoMode()) return;
    if (!db) throw new Error("DB not initialized");
    const farmId = getFarmId();
    await db.collection('farms').doc(farmId).set(this.cleanPayload({
      ...settings,
      farmId: farmId, // Ensure ID is set
      ownerUid: getUserId(), // Ensure ownership
      updatedAt: new Date()
    }), { merge: true });
  },

  async resetFarmAccount(): Promise<void> {
    if (isDemoMode()) {
        MOCK_STORE = {
            farms: {}, rabbits: [], hutches: [], transactions: [], crossings: [], 
            deliveries: [], medical: [], occupancy: [], notifications: [], weights: [], customers: []
        };
        return;
    }
    if (!db) throw new Error("DB not initialized");

    const farmId = getFarmId();
    // In Firestore, deleting a document does NOT delete subcollections.
    // We must manually delete all documents in all known subcollections.
    const collections = [
        'rabbits', 'hutches', 'crossings', 'deliveries', 'medical', 
        'hutchOccupancy', 'transactions', 'sales', 'customers', 
        'weights', 'notifications'
    ];

    const batchSize = 500; // Firestore limit

    for (const colName of collections) {
        const snapshot = await db.collection(`farms/${farmId}/${colName}`).limit(batchSize).get();
        if (!snapshot.empty) {
            const batch = db.batch();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            // Note: If > 500 items, a loop is needed. For MVP/V1 this catches most.
            // A recursive delete function is safer for large datasets.
        }
    }
  },

  async exportFarmData(): Promise<any> {
    const rabbits = await this.getRabbits();
    const hutches = await this.getHutches();
    const crossings = await this.getCrossings();
    const transactions = await this.getTransactions();
    const medical = await this.getMedicalRecords();
    const customers = await this.getCustomers();
    
    return {
      farmId: getFarmId(),
      exportedAt: new Date().toISOString(),
      rabbits,
      hutches,
      crossings,
      transactions,
      medical,
      customers
    };
  },

  // --- Rabbits ---

  /**
   * Fetches ALL rabbits to enable client-side filtering and sorting.
   * Note: For farms with < 2000 rabbits, client-side pagination is more performant 
   * and allows for instant search/filtering without complex Firestore indexes.
   */
  async getRabbits(): Promise<Rabbit[]> {
    if (isDemoMode()) return MOCK_STORE.rabbits;
    if (!db) return [];
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

  async getRabbitDetails(rabbitId: string): Promise<{
    rabbit: Rabbit;
    offspring: Rabbit[];
    medical: MedicalRecord[];
    history: HutchOccupancy[];
    pedigree: { sire?: Rabbit, doe?: Rabbit };
    litters: Crossing[];
    weights: WeightRecord[];
  }> {
    if (isDemoMode()) {
       const rabbit = MOCK_STORE.rabbits.find((r: any) => r.id === rabbitId);
       return { 
           rabbit, 
           offspring: [], 
           medical: MOCK_STORE.medical.filter((m: any) => m.rabbitId === rabbit.tag),
           history: MOCK_STORE.occupancy.filter((o: any) => o.rabbitId === rabbit.id),
           weights: MOCK_STORE.weights.filter((w: any) => w.rabbitId === rabbit.tag),
           pedigree: {},
           litters: []
       };
    }
    if (!db) throw new Error("DB not initialized");

    const farmId = getFarmId();
    
    // 1. Get Rabbit
    const rabbitRef = db.collection(`farms/${farmId}/rabbits`).doc(rabbitId);
    const rabbitDoc = await rabbitRef.get();
    if (!rabbitDoc.exists) throw new Error("Rabbit not found");
    const rabbit = convertDoc(rabbitDoc) as Rabbit;

    // 2. Parallel Fetching
    const [medicalSnap, historySnap, offspringSnap, littersSnap, weightSnap] = await Promise.all([
        db.collection(`farms/${farmId}/medical`).where('rabbitId', '==', rabbit.tag).get(),
        db.collection(`farms/${farmId}/hutchOccupancy`).where('rabbitId', '==', rabbitId).get(),
        // Finding offspring
        db.collection(`farms/${farmId}/rabbits`).where(
            rabbit.sex === Sex.Female ? 'parentage.doeId' : 'parentage.sireId', 
            '==', 
            rabbit.tag
        ).get(),
        // Finding matings
        db.collection(`farms/${farmId}/crossings`).where(
            rabbit.sex === Sex.Female ? 'doeId' : 'sireId',
            '==',
            rabbit.tag
        ).get(),
        db.collection(`farms/${farmId}/weights`).where('rabbitId', '==', rabbit.tag).get()
    ]);

    // 3. Fetch Parents (Pedigree)
    let sire, doe;
    if (rabbit.parentage.sireId) {
        const sSnap = await db.collection(`farms/${farmId}/rabbits`).where('tag', '==', rabbit.parentage.sireId).get();
        if (!sSnap.empty) sire = convertDoc(sSnap.docs[0]) as Rabbit;
    }
    if (rabbit.parentage.doeId) {
        const dSnap = await db.collection(`farms/${farmId}/rabbits`).where('tag', '==', rabbit.parentage.doeId).get();
        if (!dSnap.empty) doe = convertDoc(dSnap.docs[0]) as Rabbit;
    }

    return {
        rabbit,
        medical: medicalSnap.docs.map(doc => convertDoc(doc) as MedicalRecord)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        history: historySnap.docs.map(doc => convertDoc(doc) as HutchOccupancy)
            .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()),
        offspring: offspringSnap.docs.map(doc => convertDoc(doc) as Rabbit),
        litters: littersSnap.docs.map(doc => convertDoc(doc) as Crossing)
            .sort((a, b) => new Date(b.dateOfCrossing).getTime() - new Date(a.dateOfCrossing).getTime()),
        weights: weightSnap.docs.map(doc => convertDoc(doc) as WeightRecord)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        pedigree: { sire, doe }
    };
  },

  async getRabbitsBySex(sex: Sex): Promise<Rabbit[]> {
    if (isDemoMode()) return MOCK_STORE.rabbits.filter((r: Rabbit) => r.sex === sex);
    if (!db) return [];
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
    if (!db) return [];
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

  async getRabbitsByLitterId(litterId: string): Promise<Rabbit[]> {
    if (isDemoMode()) return MOCK_STORE.rabbits.filter((r: Rabbit) => r.litterId === litterId);
    if (!db) return [];
    try {
      const farmId = getFarmId();
      const snapshot = await db.collection(`farms/${farmId}/rabbits`)
        .where('litterId', '==', litterId)
        .get();
      return snapshot.docs.map(doc => convertDoc(doc) as Rabbit);
    } catch (error) {
      console.error("Error fetching rabbits by litter:", error);
      return [];
    }
  },

  async deleteRabbitsByLitterId(litterId: string): Promise<void> {
    if (isDemoMode()) {
        MOCK_STORE.rabbits = MOCK_STORE.rabbits.filter((r: Rabbit) => r.litterId !== litterId);
        return;
    }
    if (!db) throw new Error("DB not initialized");
    const farmId = getFarmId();
    const batch = db.batch();
    
    // Find all rabbits from this litter
    const snapshot = await db.collection(`farms/${farmId}/rabbits`)
      .where('litterId', '==', litterId)
      .get();
    
    if (snapshot.empty) return;

    for (const doc of snapshot.docs) {
       const rabbitData = doc.data() as Rabbit;
       
       // 1. Decrease hutch occupancy if assigned
       if (rabbitData.currentHutchId) {
          const hutchSnap = await db.collection(`farms/${farmId}/hutches`)
             .where('hutchId', '==', rabbitData.currentHutchId).get();
          if (!hutchSnap.empty) {
             const hutchDoc = hutchSnap.docs[0];
             const currentOcc = hutchDoc.data().currentOccupancy || 0;
             batch.update(hutchDoc.ref, { currentOccupancy: Math.max(0, currentOcc - 1) });
          }
       }
       
       // 2. Delete the rabbit document
       batch.delete(doc.ref);
    }
    
    await batch.commit();
  },

  async addRabbit(
    rabbitData: Omit<Rabbit, 'id' | 'farmId' | 'rabbitId'>, 
    isPurchase: boolean,
    kitCount: number = 1,
    litterId?: string // Optional: If coming from a breeding record
  ): Promise<void> {
    const userId = getUserId();
    const farmId = getFarmId();
    const timestamp = new Date();

    if (isDemoMode()) {
        if (litterId) {
             const c = MOCK_STORE.crossings.find((x:any) => x.id === litterId);
             if (c) c.isRecordsCreated = true;
        }
        for (let i = 0; i < kitCount; i++) {
            const id = 'mock-rabbit-' + Math.random();
            MOCK_STORE.rabbits.push({
                ...rabbitData,
                id,
                rabbitId: id,
                farmId,
                litterId,
                tag: kitCount > 1 ? `${rabbitData.tag}-${i+1}` : rabbitData.tag,
                createdAt: timestamp
            });
        }
        return;
    }
    if (!db) throw new Error("DB not initialized");

    const batch = db.batch();

    // Mark breeding record as processed if provided
    if (litterId) {
        const crossingRef = db.collection(`farms/${farmId}/crossings`).doc(litterId);
        batch.update(crossingRef, { isRecordsCreated: true });
    }

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
        litterId: litterId || null,
        createdAt: timestamp,
        updatedAt: timestamp,
        dateOfBirth: rabbitData.dateOfBirth ? new Date(rabbitData.dateOfBirth) : null,
        dateOfAcquisition: rabbitData.dateOfAcquisition ? new Date(rabbitData.dateOfAcquisition) : timestamp,
      };

      batch.set(newRabbitRef, this.cleanPayload(docData));

      if (rabbitData.weight && rabbitData.weight > 0) {
        const weightRef = db.collection(`farms/${farmId}/weights`).doc();
        batch.set(weightRef, this.cleanPayload({
            id: weightRef.id,
            rabbitId: finalTag,
            weight: rabbitData.weight,
            unit: 'kg',
            date: timestamp.toISOString(),
            ageAtRecord: 'Initial',
            notes: 'Initial weight on entry',
            farmId: farmId,
            ownerUid: userId
        }));
      }

      if (isPurchase && i === 0 && rabbitData.purchaseCost && rabbitData.purchaseCost > 0) {
        const txnRef = db.collection(`farms/${farmId}/transactions`).doc();
        batch.set(txnRef, this.cleanPayload({
          id: txnRef.id,
          farmId: farmId,
          ownerUid: userId,
          type: TransactionType.Expense,
          category: 'Livestock Purchase',
          amount: rabbitData.purchaseCost * kitCount,
          date: new Date().toISOString(),
          relatedId: newRabbitRef.id,
          notes: `Purchase of ${kitCount} rabbit(s). Tag start: ${rabbitData.tag}`
        }));
      }
      
      if (rabbitData.currentHutchId) {
         const hutchSnapshot = await db.collection(`farms/${farmId}/hutches`)
            .where('hutchId', '==', rabbitData.currentHutchId).get();
         
         if (!hutchSnapshot.empty) {
            const hutchDoc = hutchSnapshot.docs[0];
            const hutchRef = hutchDoc.ref;
            
            batch.update(hutchRef, { 
                currentOccupancy: (hutchDoc.data().currentOccupancy || 0) + 1 
            });

            const historyRef = db.collection(`farms/${farmId}/hutchOccupancy`).doc();
            batch.set(historyRef, {
                id: historyRef.id,
                rabbitId: newRabbitRef.id,
                hutchId: rabbitData.currentHutchId,
                hutchLabel: hutchDoc.data().label,
                startAt: timestamp,
                purpose: 'Housing',
                notes: 'Initial placement',
                farmId: farmId,
                ownerUid: userId,
                createdAt: timestamp
            });
         }
      }
    }

    await batch.commit();
  },

  async addBulkRabbits(
    baseData: Omit<Rabbit, 'id' | 'farmId' | 'rabbitId'>, 
    kits: { tag: string, sex: Sex, name: string, hutchId: string, breed?: string }[],
    // Removed unused isPurchase parameter
    _isPurchase: boolean, 
    litterId?: string // Optional: If coming from a breeding record
  ): Promise<void> {
      const userId = getUserId();
      const farmId = getFarmId();
      const timestamp = new Date();
  
      if (isDemoMode()) {
          if (litterId) {
             const c = MOCK_STORE.crossings.find((x:any) => x.id === litterId);
             if (c) c.isRecordsCreated = true;
          }
          kits.forEach(k => {
              const id = 'mock-rabbit-'+Math.random();
              MOCK_STORE.rabbits.push({ 
                  ...baseData, 
                  ...k, 
                  id, 
                  rabbitId: id, 
                  farmId, 
                  litterId,
                  createdAt: timestamp 
              });
          });
          return;
      }
      if (!db) throw new Error("DB not initialized");
  
      const batch = db.batch();

      // Mark breeding record as processed if provided
      if (litterId) {
        const crossingRef = db.collection(`farms/${farmId}/crossings`).doc(litterId);
        batch.update(crossingRef, { isRecordsCreated: true });
      }
  
      for (const kit of kits) {
          const newRabbitRef = db.collection(`farms/${farmId}/rabbits`).doc();
          
          const docData = {
              ...baseData,
              tag: kit.tag,
              sex: kit.sex,
              name: kit.name,
              breed: kit.breed || baseData.breed,
              currentHutchId: kit.hutchId,
              rabbitId: newRabbitRef.id,
              farmId: farmId,
              ownerUid: userId,
              litterId: litterId || null,
              createdAt: timestamp,
              updatedAt: timestamp,
              dateOfBirth: baseData.dateOfBirth ? new Date(baseData.dateOfBirth) : null,
              dateOfAcquisition: baseData.dateOfAcquisition ? new Date(baseData.dateOfAcquisition) : timestamp,
          };
  
          batch.set(newRabbitRef, this.cleanPayload(docData));
  
          if (kit.hutchId) {
             const hutchSnapshot = await db.collection(`farms/${farmId}/hutches`)
                .where('hutchId', '==', kit.hutchId).get();
             
             if (!hutchSnapshot.empty) {
                const hutchDoc = hutchSnapshot.docs[0];
                batch.update(hutchDoc.ref, { currentOccupancy: (hutchDoc.data().currentOccupancy || 0) + 1 });
  
                const historyRef = db.collection(`farms/${farmId}/hutchOccupancy`).doc();
                batch.set(historyRef, {
                    id: historyRef.id,
                    rabbitId: newRabbitRef.id,
                    hutchId: kit.hutchId,
                    hutchLabel: hutchDoc.data().label,
                    startAt: timestamp,
                    purpose: 'Housing',
                    notes: 'Initial placement (Kit)',
                    farmId: farmId,
                    ownerUid: userId,
                    createdAt: timestamp
                });
             }
          }
      }
  
      await batch.commit();
  },

  async getRabbitsByHutchId(hutchId: string): Promise<Rabbit[]> {
    const activeStatuses = [RabbitStatus.Alive, RabbitStatus.Pregnant, RabbitStatus.Weaned];
    if (isDemoMode()) {
        return MOCK_STORE.rabbits.filter((r: Rabbit) =>
          r.currentHutchId === hutchId && activeStatuses.includes(r.status)
        );
    }
    if (!db) throw new Error("DB not initialized");
    const farmId = getFarmId();
    const snapshot = await db.collection(`farms/${farmId}/rabbits`)
        .where('currentHutchId', '==', hutchId)
        .where('status', 'in', activeStatuses)
        .get();
        
    return snapshot.docs.map(doc => convertDoc(doc) as Rabbit);
  },

  async auditHutchOccupancy(): Promise<{ audited: number; corrected: number }> {
    if (isDemoMode()) {
      let corrected = 0;
      const activeStatuses = [RabbitStatus.Alive, RabbitStatus.Pregnant, RabbitStatus.Weaned];
      MOCK_STORE.hutches.forEach((h: any) => {
        const actual = MOCK_STORE.rabbits.filter(
          (r: Rabbit) => r.currentHutchId === h.hutchId && activeStatuses.includes(r.status)
        ).length;
        if (h.currentOccupancy !== actual) {
          h.currentOccupancy = actual;
          corrected++;
        }
      });
      return { audited: MOCK_STORE.hutches.length, corrected };
    }
    if (!db) throw new Error("DB not initialized");
    const farmId = getFarmId();
    const activeStatuses = [RabbitStatus.Alive, RabbitStatus.Pregnant, RabbitStatus.Weaned];

    const [hutches, rabbits] = await Promise.all([
      this.getHutches(),
      db.collection(`farms/${farmId}/rabbits`)
        .where('status', 'in', activeStatuses)
        .get()
        .then(snap => snap.docs.map(d => convertDoc(d) as Rabbit))
    ]);

    // Count active rabbits per hutchId
    const countMap: Record<string, number> = {};
    rabbits.forEach(r => {
      if (r.currentHutchId) {
        countMap[r.currentHutchId] = (countMap[r.currentHutchId] || 0) + 1;
      }
    });

    const batch = db.batch();
    let corrected = 0;
    for (const hutch of hutches) {
      const actual = countMap[hutch.hutchId] || 0;
      if (hutch.currentOccupancy !== actual) {
        const ref = db.collection(`farms/${farmId}/hutches`).doc(hutch.id!);
        batch.update(ref, { currentOccupancy: actual, updatedAt: new Date() });
        corrected++;
      }
    }
    if (corrected > 0) await batch.commit();
    return { audited: hutches.length, corrected };
  },

  async moveRabbit(rabbitId: string, targetHutchId: string | null, purpose: string, notes?: string, overrideCapacity: boolean = false): Promise<void> {
    const userId = getUserId();
    const farmId = getFarmId();
    const timestamp = new Date();

    if (isDemoMode()) {
       const r = MOCK_STORE.rabbits.find((r: any) => r.id === rabbitId);
       if (r) r.currentHutchId = targetHutchId;
       return;
    }
    if (!db) throw new Error("DB not initialized");

    const batch = db.batch();
    const rabbitRef = db.collection(`farms/${farmId}/rabbits`).doc(rabbitId);
    const rabbitDoc = await rabbitRef.get();
    
    if (!rabbitDoc.exists) throw new Error("Rabbit not found");
    const rabbitData = rabbitDoc.data() as Rabbit;

    // 1. Leave Current
    if (rabbitData.currentHutchId) {
        const occSnap = await db.collection(`farms/${farmId}/hutchOccupancy`)
            .where('rabbitId', '==', rabbitId)
            .where('hutchId', '==', rabbitData.currentHutchId)
            .where('endAt', '==', null)
            .get();
        occSnap.forEach(doc => { batch.update(doc.ref, { endAt: timestamp }); });

        const oldHutchSnap = await db.collection(`farms/${farmId}/hutches`)
            .where('hutchId', '==', rabbitData.currentHutchId).get();
        if (!oldHutchSnap.empty) {
            const currentVal = oldHutchSnap.docs[0].data().currentOccupancy || 0;
            batch.update(oldHutchSnap.docs[0].ref, { currentOccupancy: Math.max(0, currentVal - 1) });
        }
    }

    // 2. Enter New
    if (targetHutchId) {
        const newHutchSnap = await db.collection(`farms/${farmId}/hutches`)
            .where('hutchId', '==', targetHutchId).get();
        if (newHutchSnap.empty) throw new Error("Target hutch not found");
        const newHutchDoc = newHutchSnap.docs[0];
        
        // Check Capacity
        const hutchData = newHutchDoc.data();
        if (!overrideCapacity && (hutchData.currentOccupancy || 0) >= hutchData.capacity) {
            throw new Error(`Target hutch ${targetHutchId} is at capacity (${hutchData.capacity}). Please use override capacity to force move.`);
        }
        
        batch.update(newHutchDoc.ref, { currentOccupancy: (hutchData.currentOccupancy || 0) + 1 });

        const newOccRef = db.collection(`farms/${farmId}/hutchOccupancy`).doc();
        batch.set(newOccRef, this.cleanPayload({
            id: newOccRef.id,
            rabbitId: rabbitId,
            hutchId: targetHutchId,
            hutchLabel: newHutchDoc.data().label,
            startAt: timestamp,
            endAt: null,
            purpose: purpose,
            notes: notes || '',
            farmId: farmId,
            ownerUid: userId,
            createdAt: timestamp
        }));
    }

    batch.update(rabbitRef, { currentHutchId: targetHutchId, updatedAt: timestamp });
    await batch.commit();
  },

  async updateRabbit(id: string, updates: Partial<Rabbit>): Promise<void> {
    // Strip currentHutchId and status to prevent silent side-effect changes.
    // Status transitions must go through dedicated operations:
    //   - Alive → Pregnant:    updateCrossingStatus()
    //   - Alive → Dead/Slaughtered: recordMortality()
    //   - Alive → Sold:        recordSale()
    //   - Pregnant → Alive:    recordDelivery() / updateCrossingStatus(Failed)
    // Only Alive ↔ Weaned is allowed here (no side effects).
    const { currentHutchId, status: rawStatus, ...safeUpdates } = updates as any;

    // Allow only Alive ↔ Weaned transitions via edit form
    const allowedEditStatuses = [RabbitStatus.Alive, RabbitStatus.Weaned];
    if (rawStatus !== undefined && allowedEditStatuses.includes(rawStatus)) {
        safeUpdates.status = rawStatus;
    }
    // All other status values are silently ignored — they must go through proper operations

    if (isDemoMode()) {
        const idx = MOCK_STORE.rabbits.findIndex((r: Rabbit) => r.id === id);
        if (idx !== -1) {
            const oldRabbit = MOCK_STORE.rabbits[idx];
            MOCK_STORE.rabbits[idx] = { ...oldRabbit, ...safeUpdates };
            
            // Sync names if updated
            if (updates.name !== undefined && updates.name !== oldRabbit.name) {
                MOCK_STORE.crossings.forEach((c: any) => {
                    if (c.doeId === oldRabbit.tag) c.doeName = updates.name;
                    if (c.sireId === oldRabbit.tag) c.sireName = updates.name;
                });
            }
        }
        return;
    }
    
    if (!db) throw new Error("DB not initialized");
    const farmId = getFarmId();
    
    const rabbitRef = db.collection(`farms/${farmId}/rabbits`).doc(id);
    const rabbitSnap = await rabbitRef.get();
    if (!rabbitSnap.exists) throw new Error("Rabbit not found");
    const oldRabbit = rabbitSnap.data() as Rabbit;

    const batch = db.batch();
    batch.update(rabbitRef, this.cleanPayload({
      ...safeUpdates,
      updatedAt: new Date()
    }));

    // Name propagation logic: If name changed, update all historical mating records
    if (updates.name !== undefined && updates.name !== oldRabbit.name) {
        // Find crossings where this rabbit is mentioned as participant
        const [doeCrossings, sireCrossings] = await Promise.all([
            db.collection(`farms/${farmId}/crossings`).where('doeId', '==', oldRabbit.tag).get(),
            db.collection(`farms/${farmId}/crossings`).where('sireId', '==', oldRabbit.tag).get()
        ]);
        
        doeCrossings.forEach(doc => batch.update(doc.ref, this.cleanPayload({ doeName: updates.name })));
        sireCrossings.forEach(doc => batch.update(doc.ref, this.cleanPayload({ sireName: updates.name })));
    }

    await batch.commit();
  },

  async moveRabbitWithKits(motherId: string, targetHutchId: string, purpose: string, weaningAgeDays: number, notes?: string, overrideCapacity: boolean = false): Promise<void> {
    if (isDemoMode()) {
        // Mock implementation for demo mode
        const mother = MOCK_STORE.rabbits.find((r: any) => r.id === motherId);
        if (!mother) throw new Error("Mother not found");
        
        const now = new Date();
        const kitsToMove = MOCK_STORE.rabbits.filter((r: Rabbit) => {
            if (r.parentage?.doeId !== mother.tag || r.currentHutchId !== mother.currentHutchId || r.status !== RabbitStatus.Alive) return false;
            
            if (!r.dateOfBirth) return false;
            const ageDays = Math.floor((now.getTime() - new Date(r.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24));
            return ageDays < weaningAgeDays;
        });

        mother.currentHutchId = targetHutchId;
        kitsToMove.forEach((k: Rabbit) => k.currentHutchId = targetHutchId);
        return;
    }
    
    if (!db) throw new Error("DB not initialized");
    
    const farmId = getFarmId();
    const userId = getUserId();
    const timestamp = new Date();
    
    // 1. Get Mother
    const motherRef = db.collection(`farms/${farmId}/rabbits`).doc(motherId);
    const motherDoc = await motherRef.get();
    if (!motherDoc.exists) throw new Error("Mother not found");
    const motherData = motherDoc.data() as Rabbit;
    
    // 2. Get Dependent Kits
    const now = new Date();
    // Calculate cutoff date for weaning age
    const cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - weaningAgeDays);
    
    // Query kits that belong to this doe AND are in the same hutch
    const kitsSnapshot = await db.collection(`farms/${farmId}/rabbits`)
        .where('parentage.doeId', '==', motherData.tag)
        .where('currentHutchId', '==', motherData.currentHutchId)
        .where('status', '==', RabbitStatus.Alive)
        .get();
        
    // Filter dependent kits by dateOfBirth client side since Firebase index limits
    const dependentKits = kitsSnapshot.docs.filter(doc => {
       const data = doc.data() as Rabbit;
       if (!data.dateOfBirth) return false;
       return new Date(data.dateOfBirth) > cutoffDate; 
    });
    
    // 3. Batch prep
    const batch = db.batch();
    const allRabbitsToMove = [{ id: motherDoc.id, ref: motherRef, data: motherData }, ...dependentKits.map(k => ({ id: k.id, ref: k.ref, data: k.data() as Rabbit }))];
    const moveCount = allRabbitsToMove.length;
    
    // 4. Leave Current Hutch
    if (motherData.currentHutchId) {
        const oldHutchSnap = await db.collection(`farms/${farmId}/hutches`)
            .where('hutchId', '==', motherData.currentHutchId).get();
            
        if (!oldHutchSnap.empty) {
            const currentVal = oldHutchSnap.docs[0].data().currentOccupancy || 0;
            batch.update(oldHutchSnap.docs[0].ref, { currentOccupancy: Math.max(0, currentVal - moveCount) });
        }
    }
    
    // 5. Enter Target Hutch
    const newHutchSnap = await db.collection(`farms/${farmId}/hutches`)
        .where('hutchId', '==', targetHutchId).get();
    if (newHutchSnap.empty) throw new Error("Target hutch not found");
    const newHutchDoc = newHutchSnap.docs[0];
    const hutchData = newHutchDoc.data();
    
    if (!overrideCapacity && (hutchData.currentOccupancy || 0) + moveCount > hutchData.capacity) {
        throw new Error(`Target hutch ${targetHutchId} capacity (${hutchData.capacity}) exceeded. Moving ${moveCount} rabbits. Please use override capacity.`);
    }
    
    batch.update(newHutchDoc.ref, { currentOccupancy: (hutchData.currentOccupancy || 0) + moveCount });
    
    // 6. Update Rabbits and Histories
    for (const rabbit of allRabbitsToMove) {
        // End old occupancy
        if (rabbit.data.currentHutchId) {
            const occSnap = await db.collection(`farms/${farmId}/hutchOccupancy`)
                .where('rabbitId', '==', rabbit.id)
                .where('hutchId', '==', rabbit.data.currentHutchId)
                .where('endAt', '==', null)
                .get();
            occSnap.forEach(doc => { batch.update(doc.ref, { endAt: timestamp }); });
        }
        
        // Start new occupancy
        const newOccRef = db.collection(`farms/${farmId}/hutchOccupancy`).doc();
        batch.set(newOccRef, this.cleanPayload({
            id: newOccRef.id,
            rabbitId: rabbit.id,
            hutchId: targetHutchId,
            hutchLabel: hutchData.label,
            startAt: timestamp,
            endAt: null,
            purpose: purpose,
            notes: notes || 'Moved with mother',
            farmId: farmId,
            ownerUid: userId,
            createdAt: timestamp
        }));
        
        // Update rabbit doc
        batch.update(rabbit.ref, { currentHutchId: targetHutchId, updatedAt: timestamp });
    }
    
    await batch.commit();
  },

  async recordMortality(
    rabbitId: string, 
    status: RabbitStatus.Dead | RabbitStatus.Slaughtered, 
    date: string, 
    notes: string, 
    soldAmount?: number
  ): Promise<void> {
    if (isDemoMode()) {
       const idx = MOCK_STORE.rabbits.findIndex((r: Rabbit) => r.id === rabbitId);
       if (idx !== -1) {
           MOCK_STORE.rabbits[idx].status = status;
           MOCK_STORE.rabbits[idx].currentHutchId = null;
       }
       return;
    }
    if (!db) throw new Error("DB not initialized");

    const userId = getUserId();
    const farmId = getFarmId();
    const batch = db.batch();
    const timestamp = new Date();

    const rabbitRef = db.collection(`farms/${farmId}/rabbits`).doc(rabbitId);
    const rabbitDoc = await rabbitRef.get();
    
    if (!rabbitDoc.exists) throw new Error("Rabbit not found");
    const rabbitData = rabbitDoc.data() as Rabbit;

    batch.update(rabbitRef, this.cleanPayload({
       status: status,
       currentHutchId: null,
       notes: (rabbitData.notes || '') + `\n[${status} on ${date}]: ${notes}`,
       updatedAt: timestamp
    }));

    if (rabbitData.currentHutchId) {
       const hutchSnapshot = await db.collection(`farms/${farmId}/hutches`)
          .where('hutchId', '==', rabbitData.currentHutchId).get();
       if (!hutchSnapshot.empty) {
          batch.update(hutchSnapshot.docs[0].ref, { currentOccupancy: Math.max(0, (hutchSnapshot.docs[0].data().currentOccupancy || 1) - 1) });
       }
       const occSnap = await db.collection(`farms/${farmId}/hutchOccupancy`)
            .where('rabbitId', '==', rabbitId)
            .where('endAt', '==', null).get();
        occSnap.forEach(doc => { batch.update(doc.ref, { endAt: new Date(date) }); });
    }

    if (status === RabbitStatus.Slaughtered && soldAmount && soldAmount > 0) {
       const txnRef = db.collection(`farms/${farmId}/transactions`).doc();
       batch.set(txnRef, this.cleanPayload({
         id: txnRef.id,
         farmId: farmId,
         ownerUid: userId,
         type: TransactionType.Income,
         category: 'Meat Sale',
         amount: soldAmount,
         date: new Date(date).toISOString(),
         relatedId: rabbitId,
         notes: `Meat sale for rabbit ${rabbitData.tag}`
       }));
    }

    await batch.commit();
  },

  async generateNextTag(breedCode: string): Promise<string> {
    // Generate simple sequence code
    // In a robust system, we might want breed-specific sequences or farm-wide unique.
    // Here we just use a global counter but prefix with the breed code.
    const code = breedCode.toUpperCase();
    
    if (isDemoMode()) {
        const count = MOCK_STORE.rabbits.length + 1;
        return `SN-${code}-${count.toString().padStart(3,'0')}`;
    }
    if (!db) throw new Error("DB not initialized");
    const farmId = getFarmId();
    // We get total rabbits to increment sequence. 
    // Optimization: Store a counter in farm settings or a dedicated counter doc.
    const snapshot = await db.collection(`farms/${farmId}/rabbits`).get();
    const count = snapshot.size + 1;
    const seq = count.toString().padStart(3, '0');
    return `SN-${code}-${seq}`;
  },

  // --- Hutches ---

  async getHutches(): Promise<Hutch[]> {
    if (isDemoMode()) return MOCK_STORE.hutches;
    if (!db) return [];
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
    if (!db) throw new Error("DB not initialized");
    const userId = getUserId();
    const farmId = getFarmId();
    const docRef = db.collection(`farms/${farmId}/hutches`).doc();
    const hutchId = `H${data.number.toString().padStart(2, '0')}`;
    
    await docRef.set(this.cleanPayload({
      ...data,
      id: docRef.id,
      hutchId: hutchId,
      currentOccupancy: 0,
      farmId: farmId,
      ownerUid: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
  },

  async syncHutchOccupancy(hutchId: string, actualCount: number): Promise<void> {
    if (isDemoMode()) {
        const h = MOCK_STORE.hutches.find((h: any) => h.id === hutchId || h.hutchId === hutchId);
        if (h) h.currentOccupancy = actualCount;
        return;
    }
    if (!db) throw new Error("DB not initialized");
    const farmId = getFarmId();
    
    // HutchDetail passes hutch.id which is the Firestore document ID
    await db.collection(`farms/${farmId}/hutches`).doc(hutchId).update({
      currentOccupancy: actualCount,
      updatedAt: new Date()
    });
  },

  async updateHutch(id: string, updates: Partial<Hutch>): Promise<void> {
    if (isDemoMode()) return;
    if (!db) throw new Error("DB not initialized");
    const farmId = getFarmId();
    await db.collection(`farms/${farmId}/hutches`).doc(id).update(this.cleanPayload({
      ...updates,
      updatedAt: new Date()
    }));
  },

  async deleteHutch(id: string): Promise<void> {
    if (isDemoMode()) {
       MOCK_STORE.hutches = MOCK_STORE.hutches.filter((h: any) => h.id !== id);
       return;
    }
    if (!db) throw new Error("DB not initialized");
    const farmId = getFarmId();
    const hutchRef = db.collection(`farms/${farmId}/hutches`).doc(id);
    const doc = await hutchRef.get();
    if (doc.exists) {
       const data = doc.data();
       if (data && data.currentOccupancy > 0) throw new Error("Cannot delete hutch that is currently occupied.");
       await hutchRef.delete();
    }
  },

  // --- Breeding & Deliveries ---

  async getCrossings(): Promise<Crossing[]> {
    if (isDemoMode()) return MOCK_STORE.crossings;
    if (!db) return [];
    const farmId = getFarmId();
    const snapshot = await db.collection(`farms/${farmId}/crossings`)
      .orderBy('dateOfCrossing', 'desc')
      .get();
    return snapshot.docs.map(doc => convertDoc(doc) as Crossing);
  },

  async addCrossing(
    data: Omit<Crossing, 'id' | 'farmId' | 'status' | 'expectedDeliveryDate' | 'expectedPalpationDate'>
  ): Promise<void> {
    if (isDemoMode()) {
        // Duplicate guard for demo mode
        const exists = MOCK_STORE.crossings.some((c: any) =>
          c.doeId === data.doeId &&
          c.sireId === data.sireId &&
          c.dateOfCrossing === data.dateOfCrossing
        );
        if (exists) throw new Error("A mating record for this pair on this date already exists.");

        MOCK_STORE.crossings.push({
            ...data, id: 'mock-cross-'+Math.random(), status: CrossingStatus.Pending, 
            expectedPalpationDate: new Date().toISOString(), expectedDeliveryDate: new Date().toISOString()
        });
        return;
    }
    if (!db) throw new Error("DB not initialized");

    const userId = getUserId();
    const farmId = getFarmId();

    // Duplicate guard: check for same doe + sire + date
    const dupCheck = await db.collection(`farms/${farmId}/crossings`)
      .where('doeId', '==', data.doeId)
      .where('sireId', '==', data.sireId)
      .where('dateOfCrossing', '==', data.dateOfCrossing)
      .limit(1)
      .get();
    if (!dupCheck.empty) {
      throw new Error("A mating record for this pair on this date already exists.");
    }

    let settings: Farm;
    try { settings = await this.getFarmSettings(); } catch { settings = { defaultGestationDays: 31, defaultPalpationDays: 14 } as Farm; }
    
    const crossingDate = new Date(data.dateOfCrossing);
    const palpDate = new Date(crossingDate);
    palpDate.setDate(palpDate.getDate() + settings.defaultPalpationDays);
    const deliveryDate = new Date(crossingDate);
    deliveryDate.setDate(deliveryDate.getDate() + settings.defaultGestationDays);

    const docRef = db.collection(`farms/${farmId}/crossings`).doc();
    const crossingPayload: any = {
      ...data,
      id: docRef.id,
      status: CrossingStatus.Pending,
      expectedPalpationDate: palpDate,
      expectedDeliveryDate: deliveryDate,
      farmId: farmId,
      ownerUid: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await docRef.set(this.cleanPayload(crossingPayload));
    // Mating is temporary — rabbits stay in their own hutches. Only the matingHutchId is recorded.
  },

  async updateCrossing(id: string, updates: Partial<Pick<Crossing, 'doeId' | 'sireId' | 'dateOfCrossing' | 'notes' | 'doeName' | 'sireName' | 'doeHutchLabel' | 'sireHutchLabel'>>): Promise<void> {
    if (isDemoMode()) {
      const idx = MOCK_STORE.crossings.findIndex((c: any) => c.id === id);
      if (idx !== -1) MOCK_STORE.crossings[idx] = { ...MOCK_STORE.crossings[idx], ...updates };
      return;
    }
    if (!db) throw new Error("DB not initialized");
    const farmId = getFarmId();

    // If date changed, recalculate expected dates
    const extraUpdates: any = { ...updates, updatedAt: new Date() };
    if (updates.dateOfCrossing) {
      let settings: Farm;
      try { settings = await this.getFarmSettings(); } catch { settings = { defaultGestationDays: 31, defaultPalpationDays: 14 } as Farm; }
      const crossingDate = new Date(updates.dateOfCrossing);
      const palpDate = new Date(crossingDate);
      palpDate.setDate(palpDate.getDate() + settings.defaultPalpationDays);
      const deliveryDate = new Date(crossingDate);
      deliveryDate.setDate(deliveryDate.getDate() + settings.defaultGestationDays);
      extraUpdates.expectedPalpationDate = palpDate;
      extraUpdates.expectedDeliveryDate = deliveryDate;
    }

    await db.collection(`farms/${farmId}/crossings`).doc(id).update(this.cleanPayload(extraUpdates));
  },

  async deleteCrossing(id: string): Promise<void> {
    if (isDemoMode()) {
      MOCK_STORE.crossings = MOCK_STORE.crossings.filter((c: any) => c.id !== id);
      MOCK_STORE.deliveries = (MOCK_STORE.deliveries || []).filter((d: any) => d.crossingId !== id);
      return;
    }
    if (!db) throw new Error("DB not initialized");
    const farmId = getFarmId();
    const batch = db.batch();

    // Delete the crossing
    batch.delete(db.collection(`farms/${farmId}/crossings`).doc(id));

    // Also delete linked delivery records to avoid orphans
    const deliveries = await db.collection(`farms/${farmId}/deliveries`)
      .where('crossingId', '==', id).get();
    deliveries.forEach(doc => batch.delete(doc.ref));

    await batch.commit();
  },

  async syncCrossingNames(): Promise<{ updated: number }> {
    if (isDemoMode()) {
      let count = 0;
      const rabbitMap = MOCK_STORE.rabbits.reduce((acc: any, r: Rabbit) => {
        acc[r.tag] = r.name || '';
        return acc;
      }, {} as Record<string, string>);

      MOCK_STORE.crossings.forEach((c: any) => {
        let changed = false;
        const doeName = rabbitMap[c.doeId];
        if (doeName !== undefined && doeName !== c.doeName) {
          c.doeName = doeName;
          changed = true;
        }
        const sireName = rabbitMap[c.sireId];
        if (sireName !== undefined && sireName !== c.sireName) {
          c.sireName = sireName;
          changed = true;
        }
        if (changed) count++;
      });
      return { updated: count };
    }

    if (!db) throw new Error("DB not initialized");
    const farmId = getFarmId();

    const [crossings, rabbits] = await Promise.all([
      this.getCrossings(),
      this.getRabbits()
    ]);

    // Build tag → name map
    const nameMap = rabbits.reduce((acc, r) => {
      acc[r.tag] = r.name || '';
      return acc;
    }, {} as Record<string, string>);

    const batch = db.batch();
    let updatedCount = 0;

    for (const c of crossings) {
      const updates: any = {};
      let hasUpdate = false;

      const expectedDoeName = nameMap[c.doeId];
      if (expectedDoeName !== undefined && expectedDoeName !== (c.doeName || '')) {
        updates.doeName = expectedDoeName;
        hasUpdate = true;
      }

      const expectedSireName = nameMap[c.sireId];
      if (expectedSireName !== undefined && expectedSireName !== (c.sireName || '')) {
        updates.sireName = expectedSireName;
        hasUpdate = true;
      }

      if (hasUpdate) {
        const ref = db.collection(`farms/${farmId}/crossings`).doc(c.id!);
        batch.update(ref, this.cleanPayload({ ...updates, updatedAt: new Date() }));
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      await batch.commit();
    }

    return { updated: updatedCount };
  },

  async syncHistoricalHutchLabels(): Promise<{ updated: number, errors: number }> {
    if (isDemoMode()) {
      let count = 0;
      const rabbitMap = MOCK_STORE.rabbits.reduce((acc: any, r: Rabbit) => {
        acc[r.tag] = r.currentHutchId;
        return acc;
      }, {} as Record<string, string | null>);
      
      const hutchMap = MOCK_STORE.hutches.reduce((acc: any, h: Hutch) => {
        acc[h.hutchId] = h.label;
        return acc;
      }, {} as Record<string, string>);

      MOCK_STORE.crossings.forEach((c: any) => {
        let changed = false;
        if (!c.doeHutchLabel && c.doeId && rabbitMap[c.doeId]) {
          c.doeHutchLabel = hutchMap[rabbitMap[c.doeId]];
          if (c.doeHutchLabel) changed = true;
        }
        if (!c.sireHutchLabel && c.sireId && rabbitMap[c.sireId]) {
          c.sireHutchLabel = hutchMap[rabbitMap[c.sireId]];
          if (c.sireHutchLabel) changed = true;
        }
        if (changed) count++;
      });
      return { updated: count, errors: 0 };
    }

    if (!db) throw new Error("DB not initialized");
    const farmId = getFarmId();
    
    // 1. Fetch data
    const [crossings, rabbits, hutches] = await Promise.all([
      this.getCrossings(),
      this.getRabbits(),
      this.getHutches()
    ]);

    // 2. Build maps
    const rabbitMap = rabbits.reduce((acc, r) => {
      acc[r.tag] = r.currentHutchId || null;
      return acc;
    }, {} as Record<string, string | null>);

    const hutchMap = hutches.reduce((acc, h) => {
      acc[h.hutchId] = h.label;
      return acc;
    }, {} as Record<string, string>);

    // 3. Update records
    const batch = db.batch();
    let updatedCount = 0;
    
    for (const c of crossings) {
      if (c.doeHutchLabel && c.sireHutchLabel) continue;

      const updates: any = {};
      let hasUpdate = false;

      if (!c.doeHutchLabel && c.doeId && rabbitMap[c.doeId]) {
        const label = hutchMap[rabbitMap[c.doeId]!];
        if (label) {
          updates.doeHutchLabel = label;
          hasUpdate = true;
        }
      }

      if (!c.sireHutchLabel && c.sireId && rabbitMap[c.sireId]) {
        const label = hutchMap[rabbitMap[c.sireId]!];
        if (label) {
          updates.sireHutchLabel = label;
          hasUpdate = true;
        }
      }

      if (hasUpdate) {
        const ref = db.collection(`farms/${farmId}/crossings`).doc(c.id!);
        batch.update(ref, this.cleanPayload({ ...updates, updatedAt: new Date() }));
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      await batch.commit();
    }

    return { updated: updatedCount, errors: 0 };
  },

  async updateCrossingStatus(id: string, status: CrossingStatus, result?: 'Positive' | 'Negative'): Promise<void> {
    if (isDemoMode()) {
        const c = MOCK_STORE.crossings.find((x: Crossing) => x.id === id);
        if (c) { c.status = status; if(result) c.palpationResult = result; }
        return;
    }
    if (!db) throw new Error("DB not initialized");
    const farmId = getFarmId();
    const updateData: any = { status, updatedAt: new Date() };
    if (result) updateData.palpationResult = result;
    
    const crossingRef = db.collection(`farms/${farmId}/crossings`).doc(id);
    const crossingSnap = await crossingRef.get();
    const crossing = crossingSnap.data() as Crossing;

    const batch = db.batch();
    batch.update(crossingRef, this.cleanPayload(updateData));

    if (status === CrossingStatus.Pregnant && crossing.doeId) {
       const rabbits = await db.collection(`farms/${farmId}/rabbits`).where('tag', '==', crossing.doeId).get();
       if (!rabbits.empty) batch.update(rabbits.docs[0].ref, { status: RabbitStatus.Pregnant });
    }
    if (status === CrossingStatus.Failed && crossing.doeId) {
        const rabbits = await db.collection(`farms/${farmId}/rabbits`).where('tag', '==', crossing.doeId).get();
        if (!rabbits.empty) batch.update(rabbits.docs[0].ref, { status: RabbitStatus.Alive });
     }
    await batch.commit();
  },

  async recordDelivery(data: Omit<Delivery, 'id' | 'farmId'>): Promise<void> {
    if (isDemoMode()) {
        MOCK_STORE.deliveries.push(data);
        const c = MOCK_STORE.crossings.find((x: any) => x.id === data.crossingId);
        if (c) { c.status = CrossingStatus.Delivered; c.kitsBorn = data.kitsBorn; c.kitsLive = data.kitsLive; }
        return;
    }
    if (!db) throw new Error("DB not initialized");
    const userId = getUserId();
    const farmId = getFarmId();
    const batch = db.batch();
    const timestamp = new Date();

    const deliveryRef = db.collection(`farms/${farmId}/deliveries`).doc();
    batch.set(deliveryRef, this.cleanPayload({ ...data, id: deliveryRef.id, farmId, ownerUid: userId, createdAt: timestamp }));

    const crossingRef = db.collection(`farms/${farmId}/crossings`).doc(data.crossingId);
    batch.update(crossingRef, this.cleanPayload({ status: CrossingStatus.Delivered, actualDeliveryDate: data.dateOfDelivery, kitsBorn: data.kitsBorn, kitsLive: data.kitsLive, updatedAt: timestamp }));

    const doeSnapshot = await db.collection(`farms/${farmId}/rabbits`).where('tag', '==', data.doeId).get();
    if (!doeSnapshot.empty) batch.update(doeSnapshot.docs[0].ref, { status: RabbitStatus.Alive });
    
    await batch.commit();
  },

  async updateDelivery(deliveryId: string, crossingId: string, updates: Partial<Delivery>): Promise<void> {
      if (isDemoMode()) return;
      if (!db) throw new Error("DB not initialized");
      const farmId = getFarmId();
      const batch = db.batch();
      
      const delRef = db.collection(`farms/${farmId}/deliveries`).doc(deliveryId);
      batch.update(delRef, this.cleanPayload(updates));

      if (updates.kitsBorn !== undefined || updates.kitsLive !== undefined || updates.dateOfDelivery !== undefined) {
          const crossRef = db.collection(`farms/${farmId}/crossings`).doc(crossingId);
          const crossUpdate: any = {};
          if (updates.kitsBorn !== undefined) crossUpdate.kitsBorn = updates.kitsBorn;
          if (updates.kitsLive !== undefined) crossUpdate.kitsLive = updates.kitsLive;
          if (updates.dateOfDelivery !== undefined) crossUpdate.actualDeliveryDate = updates.dateOfDelivery;
          batch.update(crossRef, this.cleanPayload(crossUpdate));
      }
      await batch.commit();
  },

  async getDeliveryByCrossingId(crossingId: string): Promise<Delivery | null> {
      if (isDemoMode()) return null;
      if (!db) return null;
      const farmId = getFarmId();
      const snap = await db.collection(`farms/${farmId}/deliveries`).where('crossingId', '==', crossingId).limit(1).get();
      if (snap.empty) return null;
      return convertDoc(snap.docs[0]) as Delivery;
  },

  // --- Customers ---

  async getCustomers(): Promise<Customer[]> {
    if (isDemoMode()) return MOCK_STORE.customers;
    if (!db) return [];
    const farmId = getFarmId();
    const snapshot = await db.collection(`farms/${farmId}/customers`).orderBy('totalSpent', 'desc').get();
    return snapshot.docs.map(doc => convertDoc(doc) as Customer);
  },

  async addCustomer(data: Omit<Customer, 'id' | 'farmId' | 'totalSpent'>): Promise<string> {
    if (isDemoMode()) {
       const id = 'cust-' + Math.random();
       MOCK_STORE.customers.push({ ...data, id, totalSpent: 0, farmId: 'demo' });
       return id;
    }
    if (!db) throw new Error("DB not initialized");
    const userId = getUserId();
    const farmId = getFarmId();
    const docRef = db.collection(`farms/${farmId}/customers`).doc();
    await docRef.set(this.cleanPayload({
       ...data,
       id: docRef.id,
       totalSpent: 0,
       farmId,
       ownerUid: userId,
       createdAt: new Date()
    }));
    return docRef.id;
  },

  async updateCustomer(id: string, data: Partial<Customer>): Promise<void> {
    if (isDemoMode()) {
       const index = MOCK_STORE.customers.findIndex((c: any) => c.id === id);
       if (index !== -1) {
           MOCK_STORE.customers[index] = { ...MOCK_STORE.customers[index], ...data };
       }
       return;
    }
    if (!db) throw new Error("DB not initialized");
    const farmId = getFarmId();
    await db.collection(`farms/${farmId}/customers`).doc(id).update(this.cleanPayload({
       ...data,
       updatedAt: new Date()
    }));
  },

  // --- Finances (Sales & Transactions) ---

  async getTransactions(): Promise<Transaction[]> {
    if (isDemoMode()) return MOCK_STORE.transactions;
    if (!db) return [];
    try {
      const farmId = getFarmId();
      const snapshot = await db.collection(`farms/${farmId}/transactions`).orderBy('date', 'desc').get();
      return snapshot.docs.map(doc => convertDoc(doc) as Transaction);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      throw error;
    }
  },

  async addTransaction(data: Omit<Transaction, 'id' | 'farmId'> & { customer?: Omit<Customer, 'id' | 'farmId' | 'totalSpent'> }): Promise<void> {
    if (isDemoMode()) {
        const id = 'mock-txn-'+Math.random();
        let customerId = data.customerId;

        if (!customerId && data.customer) {
            customerId = 'mock-cust-' + Math.random();
            MOCK_STORE.customers.push({
                ...data.customer,
                id: customerId,
                farmId: 'demo',
                totalSpent: data.type === TransactionType.Income ? data.amount : 0,
                lastPurchaseDate: data.type === TransactionType.Income ? new Date(data.date).toISOString() : undefined
            });
        }

        MOCK_STORE.transactions.push({ ...data, id, farmId: 'demo', customerId });
        
        if (customerId && data.type === TransactionType.Income && !data.customer) {
           const cust = MOCK_STORE.customers.find((c: any) => c.id === customerId);
           if (cust) {
               cust.totalSpent += data.amount;
               cust.lastPurchaseDate = new Date(data.date).toISOString();
           }
        }
        return;
    }
    if (!db) throw new Error("DB not initialized");
    const userId = getUserId();
    const farmId = getFarmId();
    const batch = db.batch();
    
    let customerId = data.customerId;

    // 1. Handle New Customer
    if (!customerId && data.customer) {
        const custRef = db.collection(`farms/${farmId}/customers`).doc();
        customerId = custRef.id;
        
        const customerPayload: any = {
            ...data.customer,
            id: customerId,
            farmId,
            ownerUid: userId,
            totalSpent: data.type === TransactionType.Income ? data.amount : 0,
            lastPurchaseDate: data.type === TransactionType.Income ? new Date(data.date).toISOString() : null,
            createdAt: new Date()
        };

        batch.set(custRef, this.cleanPayload(customerPayload));
    }

    // 2. Add Transaction
    const docRef = db.collection(`farms/${farmId}/transactions`).doc();
    const transactionPayload: any = { 
        ...data, 
        id: docRef.id, 
        farmId, 
        ownerUid: userId, 
        customerId: customerId || null,
        createdAt: new Date(), 
        date: new Date(data.date).toISOString() 
    };

    batch.set(docRef, this.cleanPayload(transactionPayload));

    // 3. Update Existing Customer Totals
    if (data.customerId) {
        const custRef = db.collection(`farms/${farmId}/customers`).doc(data.customerId);
        const custSnap = await custRef.get();
        if (custSnap.exists) {
            const currentTotalSpent = custSnap.data()?.totalSpent || 0;
            const currentTotalPaid = custSnap.data()?.totalPaid || 0;
            
            if (data.type === TransactionType.Income) {
                batch.update(custRef, this.cleanPayload({ 
                    totalSpent: currentTotalSpent + data.amount,
                    lastPurchaseDate: new Date(data.date).toISOString()
                }));
            } else if (data.type === TransactionType.Expense) {
                batch.update(custRef, this.cleanPayload({ 
                    totalPaid: currentTotalPaid + data.amount
                }));
            }
        }
    }

    await batch.commit();
  },

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<void> {
    if (isDemoMode()) {
        const idx = MOCK_STORE.transactions.findIndex((t: any) => t.id === id);
        if (idx !== -1) {
            const oldTxn = MOCK_STORE.transactions[idx];
            // Reconcile customer totalSpent/totalPaid in mock
            if (oldTxn.customerId) {
                const oldCust = MOCK_STORE.customers.find((c: any) => c.id === oldTxn.customerId);
                if (oldCust) {
                    if (oldTxn.type === TransactionType.Income) oldCust.totalSpent = Math.max(0, oldCust.totalSpent - oldTxn.amount);
                    if (oldTxn.type === TransactionType.Expense) oldCust.totalPaid = Math.max(0, (oldCust.totalPaid || 0) - oldTxn.amount);
                }
            }
            MOCK_STORE.transactions[idx] = { ...oldTxn, ...updates };
            const newTxn = MOCK_STORE.transactions[idx];
            if (newTxn.customerId) {
                const newCust = MOCK_STORE.customers.find((c: any) => c.id === newTxn.customerId);
                if (newCust) {
                    if (newTxn.type === TransactionType.Income) newCust.totalSpent += newTxn.amount;
                    if (newTxn.type === TransactionType.Expense) newCust.totalPaid = (newCust.totalPaid || 0) + newTxn.amount;
                }
            }
        }
        return;
    }
    if (!db) throw new Error("DB not initialized");

    const farmId = getFarmId();
    const batch = db.batch();

    const txnRef = db.collection(`farms/${farmId}/transactions`).doc(id);
    const txnSnap = await txnRef.get();
    if (!txnSnap.exists) throw new Error("Transaction not found");
    const oldTxn = txnSnap.data() as Transaction;

    // Merge updates
    const newTxn = { ...oldTxn, ...updates };

    // 1. Update the transaction document
    const updatePayload: any = {
      ...updates,
      customerId: updates.customerId !== undefined ? updates.customerId : (oldTxn.customerId || null),
      updatedAt: new Date()
    };
    if (updates.date) {
      updatePayload.date = new Date(updates.date).toISOString();
    }
    batch.update(txnRef, this.cleanPayload(updatePayload));

    // 2. Reconcile customer totals
    const oldIsIncome = oldTxn.type === TransactionType.Income;
    const oldIsExpense = oldTxn.type === TransactionType.Expense;
    const newIsIncome = newTxn.type === TransactionType.Income;
    const newIsExpense = newTxn.type === TransactionType.Expense;
    const oldCustomerId = oldTxn.customerId;
    const newCustomerId = newTxn.customerId;

    // Subtract old contribution from old customer
    if (oldCustomerId) {
      const custRef = db.collection(`farms/${farmId}/customers`).doc(oldCustomerId);
      const custSnap = await custRef.get();
      if (custSnap.exists) {
        if (oldIsIncome) {
          const currentTotalSpent = custSnap.data()?.totalSpent || 0;
          batch.update(custRef, { totalSpent: Math.max(0, currentTotalSpent - oldTxn.amount) });
        } else if (oldIsExpense) {
          const currentTotalPaid = custSnap.data()?.totalPaid || 0;
          batch.update(custRef, { totalPaid: Math.max(0, currentTotalPaid - oldTxn.amount) });
        }
      }
    }

    // Add new contribution to new customer
    if (newCustomerId) {
      const custRef = db.collection(`farms/${farmId}/customers`).doc(newCustomerId);
      const custSnap = await custRef.get();
      if (custSnap.exists) {
        if (newIsIncome) {
          const currentTotalSpent = custSnap.data()?.totalSpent || 0;
          const adjusted = (oldCustomerId === newCustomerId && oldIsIncome)
            ? Math.max(0, currentTotalSpent - oldTxn.amount) + newTxn.amount
            : currentTotalSpent + newTxn.amount;
          batch.update(custRef, { totalSpent: Math.max(0, adjusted) });
        } else if (newIsExpense) {
          const currentTotalPaid = custSnap.data()?.totalPaid || 0;
          const adjusted = (oldCustomerId === newCustomerId && oldIsExpense)
            ? Math.max(0, currentTotalPaid - oldTxn.amount) + newTxn.amount
            : currentTotalPaid + newTxn.amount;
          batch.update(custRef, { totalPaid: Math.max(0, adjusted) });
        }
      }
    }

    await batch.commit();
  },


  async recordSale(data: Omit<Sale, 'id' | 'farmId' | 'saleId'> & { customer?: Omit<Customer, 'id' | 'farmId' | 'totalSpent'> }): Promise<void> {
    if (isDemoMode()) {
        MOCK_STORE.transactions.push({ type: TransactionType.Income, category: 'Sale', amount: data.amount, date: data.date, notes: 'Mock Sale', farmId: 'demo' });
        // Mock update customer if exists
        if (data.customerId) {
            const cust = MOCK_STORE.customers.find((c: any) => c.id === data.customerId);
            if(cust) cust.totalSpent += data.amount;
        } else if (data.customer) {
            MOCK_STORE.customers.push({ ...data.customer, id: 'new-cust', totalSpent: data.amount });
        }
        return;
    }
    if (!db) throw new Error("DB not initialized");

    const userId = getUserId();
    const farmId = getFarmId();
    const batch = db.batch();
    const timestamp = new Date();
    
    // 1. Handle Customer
    let customerId = data.customerId;

    if (customerId) {
        // Update Existing
        const custRef = db.collection(`farms/${farmId}/customers`).doc(customerId);
        const custSnap = await custRef.get();
        if (custSnap.exists) {
            const currentTotal = custSnap.data()?.totalSpent || 0;
            batch.update(custRef, this.cleanPayload({ 
                totalSpent: currentTotal + data.amount,
                lastPurchaseDate: new Date(data.date).toISOString()
            }));
        }
    } else if (data.customer) {
        // Create New Customer
        const custRef = db.collection(`farms/${farmId}/customers`).doc();
        customerId = custRef.id;
        batch.set(custRef, this.cleanPayload({
            ...data.customer,
            id: custRef.id,
            totalSpent: data.amount,
            lastPurchaseDate: new Date(data.date).toISOString(),
            farmId,
            ownerUid: userId,
            createdAt: timestamp
        }));
    }

    // 2. Create Sale Record
    const saleRef = db.collection(`farms/${farmId}/sales`).doc();
    const saleId = `S-${Math.floor(Date.now() / 1000).toString().substring(4)}`; 
    
    batch.set(saleRef, this.cleanPayload({
      ...data,
      id: saleRef.id,
      saleId: saleId,
      customerId: customerId || null,
      customer: null, // Don't save the full object in sale doc if we have ID, but keep snapshot if needed. Cleaning up.
      buyerContact: data.buyerContact || null,
      farmId,
      ownerUid: userId,
      createdAt: timestamp,
      date: new Date(data.date).toISOString()
    }));

    // 3. Create Transaction
    const txnRef = db.collection(`farms/${farmId}/transactions`).doc();
    batch.set(txnRef, this.cleanPayload({
      id: txnRef.id,
      farmId,
      ownerUid: userId,
      type: TransactionType.Income,
      category: 'Rabbit Sale',
      amount: data.amount,
      date: new Date(data.date).toISOString(),
      relatedId: saleRef.id,
      customerId: customerId || null,
      notes: `Sale of ${data.rabbitIds.length} rabbit(s) to ${data.buyerName}.`
    }));

    // 4. Update Rabbits (Mark Sold, Free Hutch)
    for (const rId of data.rabbitIds) {
      const rabbitRef = db.collection(`farms/${farmId}/rabbits`).doc(rId);
      const rDoc = await rabbitRef.get();
      if (rDoc.exists) {
          const rData = rDoc.data();
          if (rData && rData.currentHutchId) {
             const hutchSnapshot = await db.collection(`farms/${farmId}/hutches`).where('hutchId', '==', rData.currentHutchId).get();
             if (!hutchSnapshot.empty) {
                const hDoc = hutchSnapshot.docs[0];
                batch.update(hDoc.ref, { currentOccupancy: Math.max(0, (hDoc.data().currentOccupancy || 1) - 1) });
             }
             const occSnap = await db.collection(`farms/${farmId}/hutchOccupancy`).where('rabbitId', '==', rId).where('endAt', '==', null).get();
             occSnap.forEach(doc => { batch.update(doc.ref, { endAt: timestamp }); });
          }
      }
      batch.update(rabbitRef, this.cleanPayload({ status: RabbitStatus.Sold, currentHutchId: null, updatedAt: timestamp }));
    }

    await batch.commit();
  },

  // --- Medical Records ---
  
  async getMedicalRecords(rabbitId?: string): Promise<MedicalRecord[]> {
    if (isDemoMode()) {
       if (rabbitId) return MOCK_STORE.medical.filter((m: any) => m.rabbitId === rabbitId);
       return MOCK_STORE.medical;
    }
    if (!db) return [];
    const farmId = getFarmId();
    let query: any = db.collection(`farms/${farmId}/medical`).orderBy('date', 'desc');
    
    if (rabbitId) {
      const snapshot = await query.get();
      // Fix implicit any by using convertDoc which handles typing
      const records = snapshot.docs.map((doc: any) => convertDoc(doc) as MedicalRecord);
      return records.filter((r: MedicalRecord) => r.rabbitId === rabbitId);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc: any) => convertDoc(doc) as MedicalRecord);
  },

  async addMedicalRecord(data: Omit<MedicalRecord, 'id' | 'farmId' | 'rabbitId'> & { rabbitId: string }): Promise<void> {
     if (isDemoMode()) {
        MOCK_STORE.medical.push({ ...data, id: 'med-'+Math.random(), farmId: 'demo' });
        return;
     }
     if (!db) throw new Error("DB not initialized");
     const userId = getUserId();
     const farmId = getFarmId();
     const batch = db.batch();
     const timestamp = new Date();

     const medRef = db.collection(`farms/${farmId}/medical`).doc();
     const medicalPayload: any = {
       ...data,
       id: medRef.id,
       farmId,
       ownerUid: userId,
       createdAt: timestamp,
       date: new Date(data.date).toISOString(),
       nextDueDate: data.nextDueDate ? new Date(data.nextDueDate).toISOString() : null
     };

     batch.set(medRef, this.cleanPayload(medicalPayload));

     if (data.cost && data.cost > 0) {
        const txnRef = db.collection(`farms/${farmId}/transactions`).doc();
        const transactionPayload: any = {
          id: txnRef.id,
          farmId,
          ownerUid: userId,
          type: TransactionType.Expense,
          category: 'Medication',
          amount: data.cost,
          date: new Date(data.date).toISOString(),
          relatedId: medRef.id,
          notes: `${data.type}: ${data.medicationName} for rabbit ${data.rabbitId}`
        };

        batch.set(txnRef, this.cleanPayload(transactionPayload));
     }
     await batch.commit();
  },

  // --- Weight Records ---

  async addWeightRecord(rabbitId: string, weight: number, date: string, ageAtRecord: string, notes?: string): Promise<void> {
      const userId = getUserId();
      const farmId = getFarmId();
      if (isDemoMode()) {
          MOCK_STORE.weights.push({ id: 'wt-' + Math.random(), rabbitId, weight, date, ageAtRecord, unit: 'kg', notes, farmId: 'demo' });
          const r = MOCK_STORE.rabbits.find((rb: any) => rb.tag === rabbitId);
          if (r) r.weight = weight;
          return;
      }
      if (!db) throw new Error("DB not initialized");
      const batch = db.batch();
      const weightRef = db.collection(`farms/${farmId}/weights`).doc();
      batch.set(weightRef, this.cleanPayload({ id: weightRef.id, rabbitId, weight, unit: 'kg', date: new Date(date).toISOString(), ageAtRecord, notes: notes || '', farmId, ownerUid: userId }));
      const rabbitQuery = await db.collection(`farms/${farmId}/rabbits`).where('tag', '==', rabbitId).get();
      if (!rabbitQuery.empty) batch.update(rabbitQuery.docs[0].ref, this.cleanPayload({ weight: weight, updatedAt: new Date() }));
      await batch.commit();
  },

  // --- Notifications ---

  async getNotifications(limit = 10): Promise<AppNotification[]> {
    if (isDemoMode()) return MOCK_STORE.notifications;
    if (!db) return [];
    const farmId = getFarmId();
    const snapshot = await db.collection(`farms/${farmId}/notifications`).orderBy('date', 'desc').limit(limit).get();
    return snapshot.docs.map(doc => convertDoc(doc) as AppNotification);
  },

  async markNotificationRead(id: string): Promise<void> {
    if (isDemoMode()) {
        const n = MOCK_STORE.notifications.find((n:any) => n.id === id);
        if (n) n.read = true;
        return;
    }
    if (!db) throw new Error("DB not initialized");
    const farmId = getFarmId();
    await db.collection(`farms/${farmId}/notifications`).doc(id).update(this.cleanPayload({ read: true }));
  },

  async markAllNotificationsRead(): Promise<void> {
    if (isDemoMode()) {
        MOCK_STORE.notifications.forEach((n:any) => n.read = true);
        return;
    }
    if (!db) throw new Error("DB not initialized");
    const farmId = getFarmId();
    const snapshot = await db.collection(`farms/${farmId}/notifications`).where('read', '==', false).get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => { batch.update(doc.ref, this.cleanPayload({ read: true })); });
    await batch.commit();
  },

  async runDailyChecks(): Promise<void> {
    // We proceed even in demo mode to populate MOCK_STORE
    const isMock = isDemoMode();
    if (!db && !isMock) return; // Silent return if DB is truly broken and not in demo
    
    const farmId = getFarmId();
    const userId = getUserId();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    const todayNotifs = await this.getNotifications(50); // Fetch recent to check for duplicates
    const existingTitles = new Set(todayNotifs.filter(n => n.date === todayStr).map(n => n.title));

    // Helper to add notification if unique
    const addNotify = async (data: Omit<AppNotification, 'id' | 'farmId'>) => {
        if (isMock) {
            const exists = MOCK_STORE.notifications.some((n: any) => n.title === data.title && n.date === todayStr);
            if (!exists) {
                MOCK_STORE.notifications.push({ ...data, id: 'notif-' + Math.random(), farmId: 'demo', read: false });
            }
            return;
        }
        if (!db) return;
        
        // Use the in-memory Set to avoid compound query index errors and reduce reads
        if (!existingTitles.has(data.title)) {
            await db.collection(`farms/${farmId}/notifications`).add(this.cleanPayload({ ...data, farmId, ownerUid: userId, createdAt: new Date(), read: false }));
            existingTitles.add(data.title); // Prevent duplicates in the same run
        }
    };

    const farmSettings = await this.getFarmSettings();
    const leadDays = farmSettings?.notificationLeadDays ?? 3;
    const weaningAge = farmSettings?.defaultWeaningDays ?? 35;
    const crossings = await this.getCrossings();
    for (const c of crossings) {
        const diffLeadDays = leadDays;
        if (c.status === CrossingStatus.Pregnant) {
            const deliveryDate = new Date(c.expectedDeliveryDate);
            const diffTime = deliveryDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            if (diffDays <= diffLeadDays && diffDays >= 0) {
                const doeDisplay = c.doeName ? `${c.doeName} (${c.doeId})` : c.doeId;
                const location = c.doeHutchLabel ? ` in ${c.doeHutchLabel}` : '';
                await addNotify({ 
                    type: 'Urgent', 
                    title: `Delivery Due: ${doeDisplay}`, 
                    message: `Doe ${doeDisplay}${location} is expected to deliver in ${diffDays} day(s).`, 
                    date: todayStr, 
                    read: false, 
                    linkTo: 'breeding' 
                });
            }
        }
        if (c.status === CrossingStatus.Pending) {
             const palpDate = new Date(c.expectedPalpationDate);
             const diffTime = palpDate.getTime() - now.getTime();
             const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
             if (diffDays <= diffLeadDays && diffDays >= 0) {
                 const doeDisplay = c.doeName ? `${c.doeName} (${c.doeId})` : c.doeId;
                 const location = c.doeHutchLabel ? ` in ${c.doeHutchLabel}` : '';
                 await addNotify({ 
                    type: 'Info', 
                    title: `Palpation Check: ${doeDisplay}`, 
                    message: `Check pregnancy for mating with ${c.sireId} in ${diffDays} day(s). Location: ${location || 'N/A'}`, 
                    date: todayStr, 
                    read: false, 
                    linkTo: 'breeding' 
                 });
             }
        }
    }

    const rabbits = await this.getRabbits();
    for (const r of rabbits) {
        if (r.dateOfBirth && r.status === RabbitStatus.Alive) {
             const dob = new Date(r.dateOfBirth);
             const ageDays = Math.floor((now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24));
             const daysToWeaning = weaningAge - ageDays;
             if (daysToWeaning <= leadDays && daysToWeaning >= 0) {
                 const name = r.name ? `${r.name} (${r.tag})` : r.tag;
                 await addNotify({ 
                    type: 'Warning', 
                    title: `Weaning Due: ${name}`, 
                    message: `Rabbit ${name} is ready for weaning in ${daysToWeaning} day(s). Current Hutch: ${r.currentHutchId || 'Unknown'}`, 
                    date: todayStr, 
                    read: false, 
                    linkTo: 'rabbits' 
                 });
             }
        }
    }
  }
};
