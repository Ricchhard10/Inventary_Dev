import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import { VT323_400Regular } from '@expo-google-fonts/vt323';
import { SQLiteProvider, type SQLiteDatabase, useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type InventoryItem = {
  id: number;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  minimum: number;
  price: number;
};

type ItemDraft = Omit<InventoryItem, 'id' | 'quantity' | 'minimum' | 'price'> & {
  quantity: string;
  minimum: string;
  price: string;
};

const COLORS = {
  ink: '#000000',
  panel: '#080808',
  panelSoft: '#111111',
  line: '#373737',
  accent: '#FFE14A',
  accentEdge: '#7D681E',
  red: '#FF5050',
  yellow: '#FFE14A',
  white: '#FFFFFF',
  muted: '#B5B5B5',
  green: '#58ED79',
};

const PIXEL = 'PressStart2P_400Regular';
const MONO = 'VT323_400Regular';

const emptyDraft: ItemDraft = {
  name: '',
  sku: '',
  category: '',
  quantity: '0',
  minimum: '1',
  price: '0',
};

async function migrateDatabase(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS inventory_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      quantity INTEGER NOT NULL DEFAULT 0,
      minimum INTEGER NOT NULL DEFAULT 1,
      price REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function InventoryScreen() {
  const db = useSQLiteContext();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<ItemDraft>(emptyDraft);

  const loadItems = useCallback(async () => {
    const rows = await db.getAllAsync<InventoryItem>(
      'SELECT id, name, sku, category, quantity, minimum, price FROM inventory_items ORDER BY name COLLATE NOCASE'
    );
    setItems(rows);
  }, [db]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) =>
      `${item.name} ${item.sku} ${item.category}`.toLowerCase().includes(term)
    );
  }, [items, search]);

  const stats = useMemo(() => {
    const units = items.reduce((sum, item) => sum + item.quantity, 0);
    const low = items.filter((item) => item.quantity <= item.minimum).length;
    const value = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    return { units, low, value };
  }, [items]);

  const openCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft);
    setModalVisible(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setDraft({
      name: item.name,
      sku: item.sku,
      category: item.category,
      quantity: String(item.quantity),
      minimum: String(item.minimum),
      price: String(item.price),
    });
    setModalVisible(true);
  };

  const saveItem = async () => {
    const name = draft.name.trim();
    const quantity = Math.max(0, Number.parseInt(draft.quantity || '0', 10));
    const minimum = Math.max(0, Number.parseInt(draft.minimum || '0', 10));
    const price = Math.max(0, Number.parseFloat(draft.price.replace(',', '.') || '0'));

    if (!name) {
      Alert.alert('Falta el nombre', 'Escribe el nombre del producto para guardarlo.');
      return;
    }
    if (![quantity, minimum, price].every(Number.isFinite)) {
      Alert.alert('Revisa los números', 'Cantidad, mínimo y precio deben ser valores válidos.');
      return;
    }

    if (editingId) {
      await db.runAsync(
        'UPDATE inventory_items SET name = ?, sku = ?, category = ?, quantity = ?, minimum = ?, price = ? WHERE id = ?',
        name,
        draft.sku.trim(),
        draft.category.trim(),
        quantity,
        minimum,
        price,
        editingId
      );
    } else {
      await db.runAsync(
        'INSERT INTO inventory_items (name, sku, category, quantity, minimum, price) VALUES (?, ?, ?, ?, ?, ?)',
        name,
        draft.sku.trim(),
        draft.category.trim(),
        quantity,
        minimum,
        price
      );
    }

    setModalVisible(false);
    await loadItems();
  };

  const changeQuantity = async (item: InventoryItem, amount: number) => {
    await db.runAsync(
      'UPDATE inventory_items SET quantity = ? WHERE id = ?',
      Math.max(0, item.quantity + amount),
      item.id
    );
    await loadItems();
  };

  const removeItem = (item: InventoryItem) => {
    Alert.alert('Eliminar producto', `¿Quieres eliminar “${item.name}”?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await db.runAsync('DELETE FROM inventory_items WHERE id = ?', item.id);
          await loadItems();
        },
      },
    ]);
  };

  return (
    <View style={styles.app}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Image source={require('./assets/icon-arcade.png')} style={styles.logo} />
            <View>
              <Text style={styles.eyebrow}>BUG DEV / APP 01</Text>
              <Text style={styles.brand}>INVENTARY DEV</Text>
            </View>
          </View>
          <Pressable style={styles.addButton} onPress={openCreate}>
            <Text style={styles.addButtonText}>＋ NUEVO</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroTitle}>TODO EN SU{`\n`}LUGAR.</Text>
          <Text style={styles.heroCopy}>
            Registra existencias, precios y mínimos.
          </Text>
        </View>

        <View style={styles.statsRow}>
          <StatCard label="PRODUCTOS" value={String(items.length).padStart(2, '0')} accent={COLORS.green} />
          <StatCard label="UNIDADES" value={String(stats.units)} accent={COLORS.yellow} />
          <StatCard label="STOCK BAJO" value={String(stats.low).padStart(2, '0')} accent={stats.low ? COLORS.red : COLORS.green} />
        </View>

        <View style={styles.valueStrip}>
          <Text style={styles.valueLabel}>VALOR ESTIMADO</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit style={styles.valueAmount}>${stats.value.toFixed(2)}</Text>
        </View>

        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="BUSCAR NOMBRE, SKU O CATEGORÍA..."
          placeholderTextColor="#999999"
          autoCapitalize="none"
        />

        <View style={styles.sectionBar}>
          <Text style={styles.sectionTitle}>PRODUCTOS</Text>
          <Text style={styles.sectionCount}>{filteredItems.length} REGISTROS</Text>
        </View>

        {filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>□</Text>
            <Text style={styles.emptyTitle}>{items.length ? 'SIN RESULTADOS' : 'INVENTARIO VACÍO'}</Text>
            <Text style={styles.emptyCopy}>
              {items.length ? 'Prueba otra búsqueda.' : 'Agrega tu primer producto para comenzar el control.'}
            </Text>
            {!items.length && (
              <Pressable style={styles.emptyButton} onPress={openCreate}>
                <Text style={styles.emptyButtonText}>AGREGAR PRODUCTO</Text>
              </Pressable>
            )}
          </View>
        ) : (
          filteredItems.map((item) => {
            const low = item.quantity <= item.minimum;
            return (
              <View key={item.id} style={styles.itemCard}>
                <Pressable style={styles.itemMain} onPress={() => openEdit(item)}>
                  <View style={[styles.itemBadge, low && styles.itemBadgeLow]}>
                    <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.itemBadgeText, low && styles.itemBadgeTextLow]}>{item.quantity}</Text>
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemMeta}>
                      {item.sku || 'SIN SKU'} · {item.category || 'SIN CATEGORÍA'}
                    </Text>
                    <Text style={[styles.stockText, low && styles.stockLow]}>
                      {low ? '● REPONER STOCK' : '● STOCK CORRECTO'} · MÍN. {item.minimum}
                    </Text>
                  </View>
                  <Text numberOfLines={1} adjustsFontSizeToFit style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
                </Pressable>
                <View style={styles.itemActions}>
                  <Pressable style={styles.quantityButton} onPress={() => changeQuantity(item, -1)}>
                    <Text style={styles.quantityButtonText}>−</Text>
                  </Pressable>
                  <Text style={styles.quantityLabel}>AJUSTAR EXISTENCIAS</Text>
                  <Pressable style={styles.quantityButton} onPress={() => changeQuantity(item, 1)}>
                    <Text style={styles.quantityButtonText}>＋</Text>
                  </Pressable>
                  <Pressable onPress={() => removeItem(item)} hitSlop={10}>
                    <Text style={styles.deleteText}>ELIMINAR</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
        <Text style={styles.footer}>BUG DEV · DATOS GUARDADOS EN ESTE DISPOSITIVO</Text>
      </ScrollView>

      <ItemModal
        visible={modalVisible}
        editing={editingId !== null}
        draft={draft}
        setDraft={setDraft}
        onClose={() => setModalVisible(false)}
        onSave={saveItem}
      />
    </View>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statDot, { backgroundColor: accent }]} />
      <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ItemModal({
  visible,
  editing,
  draft,
  setDraft,
  onClose,
  onSave,
}: {
  visible: boolean;
  editing: boolean;
  draft: ItemDraft;
  setDraft: React.Dispatch<React.SetStateAction<ItemDraft>>;
  onClose: () => void;
  onSave: () => void;
}) {
  const field = (key: keyof ItemDraft) => (value: string) => setDraft((current) => ({ ...current, [key]: value }));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalKicker}>{editing ? 'EDITAR REGISTRO' : 'NUEVO REGISTRO'}</Text>
              <Text style={styles.modalTitle}>PRODUCTO</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Field label="NOMBRE *" value={draft.name} onChangeText={field('name')} placeholder="Ej. Cámara principal" />
            <Field label="SKU / CÓDIGO" value={draft.sku} onChangeText={field('sku')} placeholder="Ej. CAM-001" autoCapitalize="characters" />
            <Field label="CATEGORÍA" value={draft.category} onChangeText={field('category')} placeholder="Ej. Equipo" />
            <View style={styles.formRow}>
              <View style={styles.formHalf}>
                <Field label="CANTIDAD" value={draft.quantity} onChangeText={field('quantity')} keyboardType="number-pad" />
              </View>
              <View style={styles.formHalf}>
                <Field label="MÍNIMO" value={draft.minimum} onChangeText={field('minimum')} keyboardType="number-pad" />
              </View>
            </View>
            <Field label="PRECIO UNITARIO USD" currency value={draft.price} onChangeText={field('price')} keyboardType="decimal-pad" placeholder="0.00" />
            <Pressable style={styles.saveButton} onPress={onSave}>
              <Text style={styles.saveButtonText}>{editing ? 'GUARDAR CAMBIOS' : 'CREAR PRODUCTO'} →</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string; currency?: boolean }) {
  const { label, currency, ...inputProps } = props;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={currency ? styles.currencyField : undefined}>
        {currency && <Text style={styles.currencySymbol} accessible={false}>$</Text>}
        <TextInput
        {...inputProps}
        accessibilityLabel={label}
        style={[styles.input, currency && styles.currencyInput]}
        placeholderTextColor="#999999"
        selectionColor={COLORS.green}
        />
      </View>
    </View>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({ PressStart2P_400Regular, VT323_400Regular });

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.fontLoading}>
        <StatusBar style="light" />
        <ActivityIndicator color={COLORS.yellow} size="large" />
        <Text style={styles.loadingLabel}>CARGANDO...</Text>
      </View>
    );
  }

  return (
    <SQLiteProvider databaseName="bugdev-inventario.db" onInit={migrateDatabase}>
      <InventoryScreen />
    </SQLiteProvider>
  );
}

const styles = StyleSheet.create({

  app: { flex: 1, backgroundColor: COLORS.ink },
  fontLoading: { flex: 1, backgroundColor: COLORS.ink, alignItems: 'center', justifyContent: 'center', gap: 18 },
  loadingLabel: { color: COLORS.white, fontSize: 16 },
  content: { paddingTop: Platform.OS === 'ios' ? 62 : 38, paddingHorizontal: 18, paddingBottom: 42, width: '100%', maxWidth: 720, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 24 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  logo: { width: 50, height: 50, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.ink, resizeMode: 'contain' },
  eyebrow: { color: COLORS.muted, fontFamily: MONO, fontSize: 14, lineHeight: 18 },
  brand: { color: COLORS.white, fontFamily: PIXEL, fontSize: 12, lineHeight: 19 },
  addButton: { minHeight: 44, justifyContent: 'center', backgroundColor: COLORS.accent, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 4, borderRightWidth: 4, borderColor: COLORS.accentEdge },
  addButtonText: { color: COLORS.ink, fontFamily: MONO, fontSize: 21 },
  hero: { backgroundColor: COLORS.panel, borderWidth: 2, borderColor: COLORS.line, padding: 20, marginBottom: 12 },
  heroTitle: { color: COLORS.white, fontFamily: PIXEL, fontSize: 22, lineHeight: 35 },
  heroCopy: { color: COLORS.muted, fontFamily: MONO, fontSize: 22, lineHeight: 25, marginTop: 16 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, minHeight: 116, backgroundColor: COLORS.panelSoft, borderWidth: 1, borderColor: COLORS.line, padding: 12, justifyContent: 'flex-end' },
  statValue: { fontFamily: PIXEL, fontSize: 22, lineHeight: 30 },
  statLabel: { color: COLORS.white, fontFamily: MONO, fontSize: 16, lineHeight: 18, marginTop: 8 },
  sectionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 14 },
  sectionTitle: { color: COLORS.white, fontFamily: PIXEL, fontSize: 11, lineHeight: 18 },
  sectionCount: { color: COLORS.yellow, fontFamily: MONO, fontSize: 16 },
  emptyState: { alignItems: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: COLORS.line, padding: 28, backgroundColor: COLORS.ink },
  emptyIcon: { color: COLORS.accent, fontSize: 48, lineHeight: 54 },
  emptyTitle: { color: COLORS.white, fontFamily: PIXEL, fontSize: 12, lineHeight: 22, textAlign: 'center', marginTop: 10 },
  emptyCopy: { color: COLORS.muted, fontFamily: MONO, fontSize: 22, lineHeight: 25, textAlign: 'center', marginTop: 12 },
  emptyButton: { minHeight: 46, justifyContent: 'center', marginTop: 20, borderWidth: 2, borderColor: COLORS.accent, paddingHorizontal: 14, paddingVertical: 11 },
  emptyButtonText: { color: COLORS.accent, fontFamily: MONO, fontSize: 20, textAlign: 'center' },
  deleteText: { color: COLORS.red, fontFamily: MONO, fontSize: 17, paddingVertical: 12 },
  footer: { color: COLORS.muted, fontFamily: MONO, fontSize: 15, lineHeight: 19, textAlign: 'center', marginTop: 28 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, .85)' },
  modalCard: { width: '100%', maxWidth: 720, alignSelf: 'center', maxHeight: '92%', backgroundColor: COLORS.panel, borderTopWidth: 3, borderColor: COLORS.accent, padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 22 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  modalKicker: { color: COLORS.accent, fontFamily: MONO, fontSize: 17, marginBottom: 10 },
  modalTitle: { color: COLORS.white, fontFamily: PIXEL, fontSize: 22, lineHeight: 32 },
  closeText: { color: COLORS.white, fontSize: 34, lineHeight: 44, minWidth: 44, textAlign: 'center' },
  field: { marginBottom: 18 },
  fieldLabel: { color: COLORS.white, fontFamily: MONO, fontSize: 18, marginBottom: 8 },
  input: { minHeight: 54, backgroundColor: COLORS.ink, borderWidth: 1, borderColor: COLORS.line, color: COLORS.white, paddingHorizontal: 13, paddingVertical: 10, fontFamily: MONO, fontSize: 24 },
  currencyField: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.ink, borderWidth: 1, borderColor: COLORS.line },
  currencySymbol: { color: COLORS.yellow, fontFamily: MONO, fontSize: 24, paddingLeft: 13 },
  currencyInput: { flex: 1, minWidth: 0, borderWidth: 0, paddingLeft: 9, color: COLORS.yellow },
  saveButton: { minHeight: 56, backgroundColor: COLORS.accent, borderBottomWidth: 5, borderRightWidth: 5, borderColor: COLORS.accentEdge, padding: 16, alignItems: 'center', marginTop: 8 },
  saveButtonText: { color: COLORS.ink, fontFamily: MONO, fontSize: 22, textAlign: 'center' },


  statDot: { width: 7, height: 7, marginBottom: 10 },
  valueStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.panelSoft, borderLeftWidth: 4, borderLeftColor: COLORS.yellow, padding: 14, marginBottom: 16 },
  valueLabel: { color: COLORS.white, fontFamily: MONO, fontSize: 18 },
  valueAmount: { color: COLORS.yellow, fontFamily: PIXEL, fontSize: 16, lineHeight: 24, flexShrink: 1 },
  search: { height: 56, borderWidth: 2, borderColor: COLORS.line, backgroundColor: COLORS.ink, color: COLORS.white, paddingHorizontal: 14, fontFamily: MONO, fontSize: 19, marginBottom: 24 },
  itemCard: { backgroundColor: COLORS.panel, borderWidth: 2, borderColor: COLORS.line, marginBottom: 14 },
  itemMain: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  itemBadge: { width: 54, height: 54, backgroundColor: COLORS.ink, borderWidth: 2, borderColor: COLORS.green, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  itemBadgeLow: { borderColor: COLORS.red },
  itemBadgeText: { color: COLORS.green, fontFamily: PIXEL, fontSize: 17 },
  itemBadgeTextLow: { color: COLORS.red },
  itemInfo: { flex: 1, minWidth: 0 },
  itemName: { color: COLORS.white, fontFamily: MONO, fontSize: 25, lineHeight: 27, marginBottom: 5 },
  itemMeta: { color: COLORS.muted, fontFamily: MONO, fontSize: 16, lineHeight: 18, textTransform: 'uppercase' },
  stockText: { color: COLORS.green, fontFamily: MONO, fontSize: 15, lineHeight: 18, marginTop: 6 },
  stockLow: { color: COLORS.red },
  itemPrice: { color: COLORS.yellow, fontFamily: MONO, fontSize: 23, maxWidth: '28%' },
  itemActions: { minHeight: 56, borderTopWidth: 1, borderTopColor: COLORS.line, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', padding: 8, gap: 8 },
  quantityButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.panelSoft, borderWidth: 1, borderColor: COLORS.line },
  quantityButtonText: { color: COLORS.white, fontSize: 24 },
  quantityLabel: { flex: 1, minWidth: 70, color: COLORS.muted, fontFamily: MONO, fontSize: 14, lineHeight: 16 },
  formRow: { flexDirection: 'row', gap: 10 },
  formHalf: { flex: 1 },
});
