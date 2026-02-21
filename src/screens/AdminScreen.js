import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, ActivityIndicator,
  Alert, Linking, Platform
} from 'react-native';
import {
  getProducts, getCategories, createProduct, updateProduct, deleteProduct,
  createCategory, deleteCategory, getDailyReport, getMonthlyReport, extractError,
} from '../services/api';
import { C, F, R } from '../constants/theme';

const TABS = [
  { key: 'products',   label: '🥐 Ürünler' },
  { key: 'categories', label: '🏷️ Kategoriler' },
  { key: 'daily',      label: '📊 Günlük' },
  { key: 'monthly',    label: '📅 Aylık' },
];

const fmt = (v) => `₺${Number(v || 0).toFixed(2)}`;
const todayStr = () => new Date().toISOString().split('T')[0];
const BASE_URL = "https://apollo45.pythonanywhere.com/api/";

export default function AdminScreen() {
  const [activeTab, setActiveTab] = useState('products');

  return (
    <View style={styles.root}>

      {/* SABİT TAB BAR */}
      <View style={styles.tabBar}>
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

      {/* TEK ANA SCROLL */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.mainScroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.webContainer}>
          {activeTab === 'products'   && <ProductsTab />}
          {activeTab === 'categories' && <CategoriesTab />}
          {activeTab === 'daily'      && <DailyTab />}
          {activeTab === 'monthly'    && <MonthlyTab />}
        </View>
      </ScrollView>

    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*                               PRODUCTS TAB                                 */
/* -------------------------------------------------------------------------- */

function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    } catch (e) { Alert.alert('Hata', extractError(e)); }
    finally { setLoading(false); }
  }, [newCatId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!newName.trim() || !newPrice || !newCatId) {
      Alert.alert("Hata", "Lütfen isim, fiyat doldurun ve kategori seçin.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: newName.trim(),
        price: parseFloat(newPrice).toFixed(2),
        category: newCatId
      };

      if (editingId) {
        await updateProduct(editingId, payload);
        setProducts(prev => prev.map(p => p.id === editingId ? {...p, ...payload} : p));
      } else {
        const newProd = await createProduct(payload);
        setProducts(prev => [...prev, newProd]);
      }

      setNewName('');
      setNewPrice('');
      setEditingId(null);

    } catch (e) { Alert.alert('Hata', extractError(e)); }
    finally { setSaving(false); }
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setNewName(p.name);
    setNewPrice(p.price.toString());
    setNewCatId(p.category);
  };

  const handleDelete = (id) => {
    Alert.alert('Ürünü Sil', 'Silmek istediğine emin misin?', [
      { text: 'Vazgeç' },
      {
        text: 'SİL',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteProduct(id);
            setProducts(prev => prev.filter(p => p.id !== id));
          } catch (e) { Alert.alert('Hata', "Silinemedi."); }
        }
      }
    ]);
  };

  if (loading) return <Loader />;

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.formTitle}>
          {editingId ? "🎁 Ürünü Düzenle" : "🆕 Yeni Ürün Ekle"}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Ürün Adı"
          value={newName}
          onChangeText={setNewName}
          placeholderTextColor={C.txtDim}
        />

        <TextInput
          style={styles.input}
          placeholder="Fiyat"
          value={newPrice}
          onChangeText={setNewPrice}
          keyboardType="numeric"
          placeholderTextColor={C.txtDim}
        />

        <Text style={styles.label}>Kategori Seç:</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map(c => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setNewCatId(c.id)}
              style={[
                styles.catSelectBtn,
                newCatId === c.id && styles.catSelectBtnActive
              ]}
            >
              <Text style={[
                styles.catSelectTxt,
                newCatId === c.id && styles.catSelectTxtActive
              ]}>
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <TouchableOpacity
            style={[styles.primaryBtn, { flex: 2 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.primaryBtnTxt}>
              {editingId ? "GÜNCELLE" : "KAYDET"}
            </Text>
          </TouchableOpacity>

          {editingId && (
            <TouchableOpacity
              style={[styles.primaryBtn, { flex: 1, backgroundColor: C.bgLight }]}
              onPress={() => {
                setEditingId(null);
                setNewName('');
                setNewPrice('');
              }}
            >
              <Text style={[styles.primaryBtnTxt, { color: C.txtPrimary }]}>
                İPTAL
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {products.map(p => (
        <View key={p.id} style={styles.itemCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.productName}>{p.name}</Text>
            <Text style={styles.priceAmt}>{fmt(p.price)}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={() => startEdit(p)}>
              <Text style={{ fontSize: 22 }}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(p.id)}>
              <Text style={{ fontSize: 22 }}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                               OTHER TABS                                   */
/* -------------------------------------------------------------------------- */
/* CategoriesTab, DailyTab, MonthlyTab, ReportCards, StatCard, Loader */
/* SENİN ORİJİNAL KODUNLA AYNI — HİÇ DOKUNULMADI */
/* (KISALTMAMAK İÇİN BURADA TEKRAR YAZILMADI — ORİJİNALİNİ AYNEN KORU) */

/* -------------------------------------------------------------------------- */
/*                                   STYLES                                   */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bgDark },

  tabBar: {
    backgroundColor: C.bgMid,
    borderBottomWidth: 1,
    borderColor: C.border,
  },

  tabBarContent: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },

  mainScroll: {
    paddingBottom: 40,
  },

  webContainer: {
    width: '100%',
    alignSelf: 'center',
    maxWidth: Platform.OS === 'web' ? 1100 : '100%',
    paddingHorizontal: 15,
    paddingTop: 15,
  },

  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: R.full,
    backgroundColor: C.bgLight
  },

  tabActive: { backgroundColor: C.amber },

  tabTxt: {
    fontSize: F.sm,
    fontWeight: '700',
    color: C.txtSecond
  },

  tabTxtActive: { color: C.bgDark },

  card: {
    backgroundColor: C.bgMid,
    borderRadius: R.lg,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.border
  },

  formTitle: {
    color: C.amber,
    fontWeight: '900',
    marginBottom: 12,
    fontSize: F.md
  },

  label: {
    color: C.txtSecond,
    fontSize: F.xs,
    marginBottom: 5,
    fontWeight: '700'
  },

  input: {
    backgroundColor: C.bgLight,
    borderRadius: R.sm,
    padding: 12,
    color: C.txtPrimary,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border
  },

  catSelectBtn: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: C.bgLight,
    marginRight: 8,
    borderWidth: 1,
    borderColor: C.border
  },

  catSelectBtnActive: {
    backgroundColor: C.amber,
    borderColor: C.amber
  },

  catSelectTxt: {
    color: C.txtPrimary,
    fontWeight: '600'
  },

  catSelectTxtActive: {
    color: C.bgDark,
    fontWeight: '800'
  },

  primaryBtn: {
    backgroundColor: C.amber,
    borderRadius: R.sm,
    padding: 14,
    alignItems: 'center'
  },

  primaryBtnTxt: {
    color: C.bgDark,
    fontWeight: '800'
  },

  itemCard: {
    backgroundColor: C.bgMid,
    borderRadius: R.md,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border
  },

  productName: {
    color: C.txtPrimary,
    fontWeight: '700',
    fontSize: F.md
  },

  priceAmt: {
    color: C.amber,
    fontWeight: '800',
    fontSize: F.md
  },
});

function Loader() {
  return <ActivityIndicator color={C.amber} style={{ marginTop: 50 }} size="large" />;
}
