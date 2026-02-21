import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  Platform
} from 'react-native';
import {
  getProducts,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  createCategory,
  deleteCategory,
  getDailyReport,
  getMonthlyReport,
  extractError,
} from '../services/api';
import { C, F, R } from '../constants/theme';

const TABS = [
  { key: 'products', label: '🥐 Ürünler' },
  { key: 'categories', label: '🏷️ Kategoriler' },
  { key: 'daily', label: '📊 Günlük' },
  { key: 'monthly', label: '📅 Aylık' },
];

const fmt = (v) => `₺${Number(v || 0).toFixed(2)}`;
const todayStr = () => new Date().toISOString().split('T')[0];
const BASE_URL = "https://apollo45.pythonanywhere.com/api/";

export default function AdminScreen() {
  const [activeTab, setActiveTab] = useState('products');

  return (
    <View style={styles.root}>
      {/* STICKY TAB BAR */}
      <View style={styles.tabBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
        >
          {TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, activeTab === t.key && styles.tabActive]}
              onPress={() => setActiveTab(t.key)}
            >
              <Text style={[styles.tabTxt, activeTab === t.key && styles.tabTxtActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* TEK SCROLL NOKTASI */}
      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={styles.mainContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={Platform.OS === 'web'}
      >
        <View style={styles.centerContainer}>
          {activeTab === 'products' && <ProductsTab />}
          {activeTab === 'categories' && <CategoriesTab />}
          {activeTab === 'daily' && <DailyTab />}
          {activeTab === 'monthly' && <MonthlyTab />}
        </View>
      </ScrollView>
    </View>
  );
}

/* ================= PRODUCTS ================= */

function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCatId, setNewCatId] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([getProducts(), getCategories()]);
      setProducts(p);
      setCategories(c);
      if (c.length > 0 && !newCatId) setNewCatId(c[0].id);
    } catch (e) {
      Alert.alert('Hata', extractError(e));
    } finally {
      setLoading(false);
    }
  }, [newCatId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!newName.trim() || !newPrice || !newCatId) {
      Alert.alert("Hata", "Alanları doldurun.");
      return;
    }

    try {
      const payload = {
        name: newName.trim(),
        price: parseFloat(newPrice).toFixed(2),
        category: newCatId
      };

      if (editingId) {
        await updateProduct(editingId, payload);
        setProducts(prev =>
          prev.map(p => p.id === editingId ? { ...p, ...payload } : p)
        );
      } else {
        const newProd = await createProduct(payload);
        setProducts(prev => [...prev, newProd]);
      }

      setNewName('');
      setNewPrice('');
      setEditingId(null);

    } catch (e) {
      Alert.alert("Hata", extractError(e));
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Sil', 'Emin misin?', [
      { text: 'Vazgeç' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await deleteProduct(id);
          setProducts(prev => prev.filter(p => p.id !== id));
        }
      }
    ]);
  };

  if (loading) return <Loader />;

  return (
    <View>
      <View style={styles.card}>
        <Text style={styles.formTitle}>
          {editingId ? "Ürünü Düzenle" : "Yeni Ürün"}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Ürün Adı"
          value={newName}
          onChangeText={setNewName}
        />

        <TextInput
          style={styles.input}
          placeholder="Fiyat"
          value={newPrice}
          onChangeText={setNewPrice}
          keyboardType="numeric"
        />

        <TouchableOpacity style={styles.primaryBtn} onPress={handleSave}>
          <Text style={styles.primaryBtnTxt}>
            {editingId ? "GÜNCELLE" : "EKLE"}
          </Text>
        </TouchableOpacity>
      </View>

      {products.map(p => (
        <View key={p.id} style={styles.itemCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.productName}>{p.name}</Text>
            <Text style={styles.priceAmt}>{fmt(p.price)}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 15 }}>
            <TouchableOpacity onPress={() => {
              setEditingId(p.id);
              setNewName(p.name);
              setNewPrice(p.price.toString());
              setNewCatId(p.category);
            }}>
              <Text style={{ fontSize: 20 }}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(p.id)}>
              <Text style={{ fontSize: 20 }}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

/* ================= CATEGORIES ================= */

function CategoriesTab() {
  const [cats, setCats] = useState([]);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    getCategories().then(setCats);
  }, []);

  return (
    <View>
      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="Kategori"
          value={newName}
          onChangeText={setNewName}
        />
        <TouchableOpacity style={styles.primaryBtn}>
          <Text style={styles.primaryBtnTxt}>EKLE</Text>
        </TouchableOpacity>
      </View>

      {cats.map(c => (
        <View key={c.id} style={styles.itemCard}>
          <Text style={styles.productName}>{c.name}</Text>
        </View>
      ))}
    </View>
  );
}

/* ================= REPORTS ================= */

function DailyTab() {
  const [dateStr, setDateStr] = useState(todayStr());
  const [report, setReport] = useState(null);

  useEffect(() => {
    getDailyReport(dateStr).then(setReport);
  }, []);

  return (
    <View>
      {report && (
        <View style={styles.card}>
          <Text style={styles.productName}>Toplam:</Text>
          <Text style={styles.priceAmt}>{fmt(report.total_revenue)}</Text>
        </View>
      )}
    </View>
  );
}

function MonthlyTab() {
  const now = new Date();
  const [report, setReport] = useState(null);

  useEffect(() => {
    getMonthlyReport(now.getFullYear(), now.getMonth() + 1)
      .then(setReport);
  }, []);

  return (
    <View>
      {report && (
        <View style={styles.card}>
          <Text style={styles.productName}>Toplam:</Text>
          <Text style={styles.priceAmt}>{fmt(report.total_revenue)}</Text>
        </View>
      )}
    </View>
  );
}

/* ================= LOADER ================= */

function Loader() {
  return (
    <ActivityIndicator
      color={C.amber}
      size="large"
      style={{ marginTop: 40 }}
    />
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bgDark,
    ...(Platform.OS === 'web' && {
      height: '100%',
      overflow: 'hidden'
    })
  },

  tabBarWrapper: {
    backgroundColor: C.bgMid,
    borderBottomWidth: 1,
    borderColor: C.border,
    zIndex: 10
  },

  tabBarContent: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    gap: 8
  },

  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: R.full,
    backgroundColor: C.bgLight
  },

  tabActive: {
    backgroundColor: C.amber
  },

  tabTxt: {
    fontSize: F.sm,
    fontWeight: '700',
    color: C.txtSecond
  },

  tabTxtActive: {
    color: C.bgDark
  },

  mainScroll: {
    flex: 1
  },

  mainContent: {
    paddingVertical: 20,
    paddingBottom: 80,
    minHeight: Platform.OS === 'web' ? '100%' : undefined
  },

  centerContainer: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center'
  },

  card: {
    backgroundColor: C.bgMid,
    borderRadius: R.lg,
    padding: 16,
    marginBottom: 20
  },

  formTitle: {
    color: C.amber,
    fontWeight: '900',
    marginBottom: 12
  },

  input: {
    backgroundColor: C.bgLight,
    padding: 12,
    borderRadius: R.sm,
    marginBottom: 10
  },

  primaryBtn: {
    backgroundColor: C.amber,
    padding: 14,
    borderRadius: R.sm,
    alignItems: 'center'
  },

  primaryBtnTxt: {
    fontWeight: '800',
    color: C.bgDark
  },

  itemCard: {
    backgroundColor: C.bgMid,
    padding: 14,
    borderRadius: R.md,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center'
  },

  productName: {
    color: C.txtPrimary,
    fontWeight: '700'
  },

  priceAmt: {
    color: C.amber,
    fontWeight: '900'
  }
});
