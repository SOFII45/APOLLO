import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  ScrollView, StyleSheet, useWindowDimensions,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import {
  getOrder, getProducts, getCategories, createOrder,
  addOrderItem, updateOrderItem, deleteOrderItem, extractError,
} from '../services/api';
import { C, F, R, S } from '../constants/theme';
import PaymentModal from '../components/PaymentModal';

const fmt = (v) => `₺${Number(v || 0).toFixed(2)}`;

export default function OrderScreen({ route, navigation }) {
  const { orderId: initialOrderId, tableId, tableName } = route.params;
  
  // orderId'yi state'e aldık çünkü null başlayıp ürün eklenince dolacak
  const [orderId, setOrderId] = useState(initialOrderId);
  const { width } = useWindowDimensions();
  const isTablet  = width >= 700;

  const [order,      setOrder]      = useState(null);
  const [categories, setCategories] = useState([]);
  const [products,   setProducts]   = useState([]);
  const [activeCat,  setActiveCat]  = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [busyItem,   setBusyItem]   = useState(null); 
  const [payVisible, setPayVisible] = useState(false);

  // ── Load ─────────────────────────────────────────────────────────────────────
  const fetchOrder = useCallback(async (id) => {
    if (!id || id === 'null') return; // 404 Hatasını önleyen kritik satır
    try {
      const data = await getOrder(id);
      setOrder(data);
    } catch (e) {
      console.log("Sipariş henüz mevcut değil.");
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const [cats, prods] = await Promise.all([
          getCategories(),
          getProducts({ active_only: true }),
        ]);
        setCategories(cats);
        setActiveCat(cats[0]?.id ?? null);
        setProducts(prods);
        
        if (orderId && orderId !== 'null') {
          const ord = await getOrder(orderId);
          setOrder(ord);
        } else {
          // Boş masa için boş sepet şablonu
          setOrder({ items: [], total_amount: 0 });
        }
      } catch (e) {
        Alert.alert('Hata', extractError(e));
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [orderId]);

  // ── Filtered products ─────────────────────────────────────────────────────────
  const visible = activeCat ? products.filter(p => p.category === activeCat) : products;

  // ── Add product ───────────────────────────────────────────────────────────────
  const handleAddProduct = async (product) => {
    if (busyItem) return;
    setBusyItem(`p-${product.id}`);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      let currentOrderId = orderId;

      // EĞER SİPARİŞ YOKSA ÖNCE OLUŞTUR (Lazy Creation)
      if (!currentOrderId || currentOrderId === 'null') {
        const newOrder = await createOrder(tableId);
        currentOrderId = newOrder.id;
        setOrderId(currentOrderId);
      }

      const existing = order?.items?.find(i => i.product === product.id);
      if (existing) {
        await updateOrderItem(existing.id, existing.quantity + 1);
      } else {
        await addOrderItem(currentOrderId, product.id, 1);
      }
      await fetchOrder(currentOrderId);
    } catch (e) {
      Alert.alert('Hata', extractError(e));
    } finally {
      setBusyItem(null);
    }
  };

  // ── Change item quantity ──────────────────────────────────────────────────────
  const handleQty = async (item, delta) => {
    if (busyItem || !orderId) return;
    setBusyItem(`i-${item.id}`);
    try {
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        await deleteOrderItem(item.id);
      } else {
        await updateOrderItem(item.id, newQty);
      }
      await fetchOrder(orderId);
    } catch (e) {
      Alert.alert('Hata', extractError(e));
    } finally {
      setBusyItem(null);
    }
  };

  // ── Payment done ──────────────────────────────────────────────────────────────
  const handlePaymentDone = async () => {
    setPayVisible(false);
    if (!orderId) { navigation.goBack(); return; }
    try {
      const fresh = await getOrder(orderId);
      if (fresh.is_paid) {
        navigation.goBack();
      } else {
        setOrder(fresh);
      }
    } catch {
      navigation.goBack();
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.amber} />
      </View>
    );
  }

  // ── Sub-views ─────────────────────────────────────────────────────────────────

  const CategoryBar = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catBar} contentContainerStyle={styles.catBarContent}>
      <TouchableOpacity style={[styles.catChip, activeCat === null && styles.catChipActive]} onPress={() => setActiveCat(null)}>
        <Text style={[styles.catChipTxt, activeCat === null && styles.catChipTxtActive]}>Tümü</Text>
      </TouchableOpacity>
      {categories.map(c => (
        <TouchableOpacity key={c.id} style={[styles.catChip, activeCat === c.id && styles.catChipActive]} onPress={() => setActiveCat(c.id)}>
          <Text style={[styles.catChipTxt, activeCat === c.id && styles.catChipTxtActive]}>{c.name}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const productCols = isTablet ? 3 : 2;

  const ProductGrid = () => (
    <FlatList
      data={visible}
      keyExtractor={p => String(p.id)}
      numColumns={productCols}
      key={`pgrid-${productCols}`}
      contentContainerStyle={styles.productGrid}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={<View style={styles.emptyBox}><Text style={styles.emptyTxt}>Bu kategoride ürün yok</Text></View>}
      renderItem={({ item }) => {
        const isBusy = busyItem === `p-${item.id}`;
        const inCart = order?.items?.find(i => i.product === item.id);
        return (
          <TouchableOpacity
            style={[styles.productCard, inCart && styles.productCardActive, S.float]}
            onPress={() => handleAddProduct(item)}
            activeOpacity={0.78}
            disabled={!!busyItem}
          >
            {isBusy ? <ActivityIndicator color={C.amber} /> : (
              <>
                {inCart && <View style={styles.productBadge}><Text style={styles.productBadgeTxt}>{inCart.quantity}</Text></View>}
                <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.productPrice}>{fmt(item.price)}</Text>
              </>
            )}
          </TouchableOpacity>
        );
      }}
    />
  );

  const CartPanel = ({ style }) => (
    <View style={[styles.cart, style]}>
      <Text style={styles.cartTitle}>Sepet</Text>
      {!order?.items?.length ? (
        <View style={styles.cartEmpty}><Text style={styles.cartEmptyTxt}>Henüz ürün eklenmedi</Text></View>
      ) : (
        <ScrollView style={styles.cartList} showsVerticalScrollIndicator={false}>
          {order.items.map(item => {
            const isBusy = busyItem === `i-${item.id}`;
            return (
              <View key={item.id} style={styles.cartItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cartItemName} numberOfLines={1}>{item.product_name}</Text>
                  <Text style={styles.cartItemPrice}>{fmt(item.price_at_order)} × {item.quantity}</Text>
                </View>
                <View style={styles.qtyRow}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => handleQty(item, -1)} disabled={!!busyItem}><Text style={styles.qtyBtnTxt}>−</Text></TouchableOpacity>
                  {isBusy ? <ActivityIndicator size="small" color={C.amber} style={{ width: 28 }} /> : <Text style={styles.qtyVal}>{item.quantity}</Text>}
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => handleQty(item, +1)} disabled={!!busyItem}><Text style={styles.qtyBtnTxt}>+</Text></TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
      <View style={styles.cartFooter}>
        <View style={styles.totalRow}><Text style={styles.totalLbl}>Toplam</Text><Text style={styles.totalAmt}>{fmt(order?.total_amount)}</Text></View>
        {order?.amount_paid > 0 && <View style={styles.paidRow}><Text style={styles.paidLbl}>Ödendi</Text><Text style={styles.paidAmt}>{fmt(order.amount_paid)}</Text></View>}
        {Number(order?.remaining_balance) > 0 && <View style={styles.remainRow}><Text style={styles.remainLbl}>Kalan</Text><Text style={styles.remainAmt}>{fmt(order.remaining_balance)}</Text></View>}
        <TouchableOpacity style={[styles.payBtn, (!order?.items?.length || order?.is_paid) && styles.payBtnOff]} onPress={() => setPayVisible(true)} disabled={!order?.items?.length || order?.is_paid} activeOpacity={0.8}>
          <Text style={styles.payBtnTxt}>{order?.is_paid ? '✓ Ödendi' : '💳 Ödeme Al'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={isTablet ? styles.splitRoot : styles.stackRoot}>
      {isTablet ? (
        <><View style={styles.splitLeft}><CategoryBar /><ProductGrid /></View><CartPanel style={styles.splitRight} /></>
      ) : (
        <><CategoryBar /><View style={{ flex: 1 }}><ProductGrid /></View><CartPanel /></>
      )}
      <PaymentModal visible={payVisible} order={order} onClose={() => setPayVisible(false)} onDone={handlePaymentDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bgDark },
  splitRoot: { flex: 1, flexDirection: 'row', backgroundColor: C.bgDark },
  splitLeft: { flex: 1, borderRightWidth: 1, borderColor: C.border },
  splitRight: { width: 320, borderLeftWidth: 0 },
  stackRoot: { flex: 1, backgroundColor: C.bgDark },
  catBar: { backgroundColor: C.bgMid, borderBottomWidth: 1, borderColor: C.border, maxHeight: 54 },
  catBarContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  catChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: R.full, backgroundColor: C.bgLight, borderWidth: 1, borderColor: C.border },
  catChipActive: { backgroundColor: C.amber, borderColor: C.amber },
  catChipTxt: { fontSize: F.sm, fontWeight: '600', color: C.txtSecond },
  catChipTxtActive: { color: C.bgDark, fontWeight: '800' },
  productGrid: { padding: 10, paddingBottom: 16 },
  productCard: { flex: 1, margin: 5, backgroundColor: C.bgMid, borderRadius: R.md, padding: 14, minHeight: 88, alignItems: 'flex-start', justifyContent: 'space-between', borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  productCardActive: { borderColor: C.amber, backgroundColor: C.bgLight },
  productBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: C.amber, borderRadius: R.full, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  productBadgeTxt: { color: C.bgDark, fontSize: F.xs, fontWeight: '800' },
  productName:  { fontSize: F.sm, fontWeight: '700', color: C.txtPrimary, flex: 1 },
  productPrice: { fontSize: F.md, fontWeight: '800', color: C.amber, marginTop: 6 },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyTxt: { color: C.txtDim, fontSize: F.md },
  cart: { backgroundColor: C.bgMid, borderTopWidth: 1, borderColor: C.border, padding: 14, maxHeight: 360 },
  cartTitle: { fontSize: F.lg, fontWeight: '800', color: C.txtPrimary, marginBottom: 10 },
  cartEmpty: { paddingVertical: 14, alignItems: 'center' },
  cartEmptyTxt: { color: C.txtDim, fontSize: F.sm },
  cartList: { maxHeight: 150 },
  cartItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderColor: C.border, gap: 8 },
  cartItemName: { fontSize: F.sm, fontWeight: '700', color: C.txtPrimary },
  cartItemPrice: { fontSize: F.xs, color: C.txtSecond, marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: { width: 30, height: 30, borderRadius: R.sm, backgroundColor: C.bgLight, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  qtyBtnTxt: { fontSize: F.lg, color: C.txtPrimary, lineHeight: 22 },
  qtyVal: { fontSize: F.md, fontWeight: '800', color: C.txtPrimary, minWidth: 26, textAlign: 'center' },
  cartFooter: { marginTop: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderColor: C.border },
  totalLbl: { fontSize: F.md, fontWeight: '600', color: C.txtSecond },
  totalAmt: { fontSize: F.xl, fontWeight: '800', color: C.txtPrimary },
  paidRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4 },
  paidLbl:  { fontSize: F.sm, color: C.success },
  paidAmt:  { fontSize: F.sm, fontWeight: '700', color: C.success },
  remainRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4 },
  remainLbl: { fontSize: F.sm, color: C.warning },
  remainAmt: { fontSize: F.sm, fontWeight: '800', color: C.warning },
  payBtn: { backgroundColor: C.amber, borderRadius: R.md, padding: 14, alignItems: 'center', marginTop: 10 },
  payBtnOff: { backgroundColor: C.bgLight, opacity: 0.5 },
  payBtnTxt: { color: C.bgDark, fontWeight: '800', fontSize: F.md },
});
