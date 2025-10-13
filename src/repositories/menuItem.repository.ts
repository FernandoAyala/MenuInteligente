import { getFirestore } from '../config/firebase.config';
import { MenuItem, CreateMenuItemDto, UpdateMenuItemDto } from '../models/menuItem.model';

const COLLECTION_NAME = 'menuItems';

/**
 * Repository para gestionar items del menú en Firestore
 */
export class MenuItemRepository {
  private db: FirebaseFirestore.Firestore;
  private collection: FirebaseFirestore.CollectionReference;

  constructor() {
    this.db = getFirestore();
    this.collection = this.db.collection(COLLECTION_NAME);
  }

  /**
   * Crear un nuevo item del menú
   */
  async create(data: CreateMenuItemDto): Promise<MenuItem> {
    const docRef = await this.collection.add({
      ...data,
      createdAt: new Date(),
    });

    const doc = await docRef.get();
    return this.mapToMenuItem(doc);
  }

  /**
   * Obtener un item por ID
   */
  async findById(id: string): Promise<MenuItem | null> {
    const doc = await this.collection.doc(id).get();
    
    if (!doc.exists) {
      return null;
    }

    return this.mapToMenuItem(doc);
  }

  /**
   * Obtener todos los items disponibles
   */
  async findAllAvailable(): Promise<MenuItem[]> {
    const snapshot = await this.collection
      .where('available', '==', true)
      .get();

    return snapshot.docs.map((doc) => this.mapToMenuItem(doc));
  }

  /**
   * Obtener items por categoría
   */
  async findByCategory(category: string): Promise<MenuItem[]> {
    const snapshot = await this.collection
      .where('category', '==', category)
      .where('available', '==', true)
      .get();

    return snapshot.docs.map((doc) => this.mapToMenuItem(doc));
  }

  /**
   * Actualizar un item
   */
  async update(id: string, data: UpdateMenuItemDto): Promise<MenuItem | null> {
    const docRef = this.collection.doc(id);
    await docRef.update(data);

    const doc = await docRef.get();
    if (!doc.exists) {
      return null;
    }

    return this.mapToMenuItem(doc);
  }

  /**
   * Eliminar un item (soft delete - marca como no disponible)
   */
  async delete(id: string): Promise<boolean> {
    const docRef = this.collection.doc(id);
    await docRef.update({ available: false });
    return true;
  }

  /**
   * Mapear documento de Firestore a MenuItem
   */
  private mapToMenuItem(doc: FirebaseFirestore.DocumentSnapshot): MenuItem {
    const data = doc.data();
    if (!data) {
      throw new Error(`No se encontraron datos para el documento ${doc.id}`);
    }

    return {
      id: doc.id,
      name: data.name,
      description: data.description,
      price: data.price,
      currency: data.currency,
      category: data.category,
      spicyLevel: data.spicyLevel,
      isVegan: data.isVegan,
      isVegetarian: data.isVegetarian,
      isGlutenFree: data.isGlutenFree,
      allergens: data.allergens || [],
      available: data.available,
      createdAt: data.createdAt?.toDate() || new Date(),
    };
  }
}
