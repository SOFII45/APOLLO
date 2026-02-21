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
  const { orderId: initialOrderId, tableId } = route.params;

  const [orderId, setOrderId] = useState(initialOrderId);
  const { width } = useWindowDimensions();

  const isTablet = width >= 768;
  const isDesktop = width >= 1200;

  const [order, setOrder] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyItem, setBusyItem] = useState(null);
  const [payVisible, setPayVisible] = useState(false);

  ////////////////////////////////////////////////////////////
  // LOAD
  ////////////////////////////////////////////////////////////

  const fetchOrder = useCallback(async (id) => {
    if (!id) return;
    try {
      const data = await getOrder(id);
      setOrder(data);
    } catch {}
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

        if (orderId) {
          const ord = await getOrder(orderId);
          setOrder(ord);
        } else {
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

  ////////////////////////////////////////////////////////////
  // PRODUCT ADD
  ////////////////////////////////////////////////////////////

  const handleAddProduct = async (product) => {
    if (busyItem) return;
    setBusyItem(`p-${product.id}`);

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      let currentId = orderId;

      if (!currentId) {
        const newOrder = await createOrder(tableId);
        currentId = newOrder.id;
        setOrderId(currentId);
      }

      const existing = order?.items?.find(i => i.product === product.id);

      if (existing) {
        await updateOrderItem(existing.id, existing.quantity + 1);
      } else {
        await addOrderItem(currentId, product.id, 1);
      }

      await fetchOrder(currentId);
    } catch (e) {
      Alert.alert('Hata', extractError(e));
    } finally {
      setBusyItem(null);
    }
  };

  ////////////////////////////////////////////////////////////
  // QTY CHANGE
  ////////////////////////////////////////////////////////////

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

  ////////////////////////////////////////////////////////////

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.amber} />
      </View>
    );
  }

  const visible = activeCat
    ? products.filter(p => p.category === activeCat)
    : products;

  const columns = isDesktop ? 4 : isTablet ? 3 : 2;

  ////////////////////////////////////////////////////////////
  // UI
  ////////////////////////////////////////////////////////////

  return (
    <View style={styles.root}>
      {/* LEFT */}
      <View style={styles.left}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.catBar}
        >
          {categories.map(c => (
            <TouchableOpacity
              key={c.id}
              style={[
                styles.catChip,
                activeCat === c.id && styles.catChipActive
              ]}
              onPress={() => setActiveCat(c.id)}
            >
              <Text style={[
                styles.catTxt,
                activeCat === c.id && styles.catTxtActive
              ]}>
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <FlatList
          data={visible}
          keyExtractor={p => String(p.id)}
          numColumns={columns}
          key={columns}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => {
            const inCart = order?.items?.find(i => i.product === item.id);
            return (
              <TouchableOpacity
                style={[
                  styles.card,
                  inCart && styles.cardActive
                ]}
                onPress={() => handleAddProduct(item)}
              >
                {inCart && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeTxt}>{inCart.quantity}</Text>
                  </View>
                )}
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.price}>{fmt(item.price)}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* RIGHT CART */}
      <View style={styles.cart}>
        <Text style={styles.cartTitle}>Sepet</Text>

        <ScrollView style={{ flex: 1 }}>
          {order?.items?.map(item => (
            <View key={item.id} style={styles.cartItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cartName}>{item.product_name}</Text>
                <Text style={styles.cartSub}>
                  {fmt(item.price_at_order)} × {item.quantity}
                </Text>
              </View>

              <View style={styles.qtyRow}>
                <TouchableOpacity onPress={() => handleQty(item, -1)}>
                  <Text style={styles.qtyBtn}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qtyVal}>{item.quantity}</Text>
                <TouchableOpacity onPress={() => handleQty(item, +1)}>
                  <Text style={styles.qtyBtn}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.total}>
            Toplam: {fmt(order?.total_amount)}
          </Text>

          <TouchableOpacity
            style={styles.payBtn}
            onPress={() => setPayVisible(true)}
          >
            <Text style={styles.payTxt}>Ödeme Al</Text>
          </TouchableOpacity>
        </View>
      </View>

      <PaymentModal
        visible={payVisible}
        order={order}
        onClose={() => setPayVisible(false)}
        onDone={() => navigation.goBack()}
      />
    </View>
  );
}

////////////////////////////////////////////////////////////
// STYLES
////////////////////////////////////////////////////////////

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0F172A',
  },

  left: {
    flex: 1,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  catBar: {
    backgroundColor: '#111827',
    padding: 10,
  },

  catChip: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },

  catChipActive: {
    backgroundColor: '#F59E0B',
  },

  catTxt: {
    color: '#D1D5DB',
    fontWeight: '600',
  },

  catTxtActive: {
    color: '#111827',
  },

  grid: {
    padding: 12,
  },

  card: {
    flex: 1,
    margin: 8,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    minHeight: 110,
    justifyContent: 'space-between',
  },

  cardActive: {
    borderWidth: 2,
    borderColor: '#F59E0B',
  },

  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#F59E0B',
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  badgeTxt: {
    fontWeight: '800',
    color: '#111827',
  },

  productName: {
    color: '#FFF',
    fontWeight: '700',
  },

  price: {
    color: '#F59E0B',
    fontWeight: '800',
  },

  cart: {
    width: 360,
    backgroundColor: '#111827',
    padding: 16,
  },

  cartTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },

  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  cartName: {
    color: '#FFF',
    fontWeight: '700',
  },

  cartSub: {
    color: '#9CA3AF',
    fontSize: 12,
  },

  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  qtyBtn: {
    fontSize: 22,
    color: '#F59E0B',
  },

  qtyVal: {
    color: '#FFF',
    fontWeight: '800',
  },

  footer: {
    borderTopWidth: 1,
    borderColor: '#1F2937',
    paddingTop: 10,
  },

  total: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 10,
  },

  payBtn: {
    backgroundColor: '#F59E0B',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },

  payTxt: {
    color: '#111827',
    fontWeight: '900',
  },
});
